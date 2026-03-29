import WEAPON_CONFIG from './WeaponConfig.js';
import { networkManager } from '../services/NetworkManager.js';

/**
 * @class Player
 * @description Gère la physique Matter.js, les doubles animations (Héros + Arme), 
 * le système de stamina et la gestion des dégâts/mort.
 */

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // Configuration physiqye
        this.body = scene.matter.add.circle(x, y + 10, 5, {
            isSensor: false,
            inertia: Infinity,
            frictionAir: 0.1,
            label: 'heroBody',
            collisionFilter: {
                category: 0x0002,
                mask: 0x0001
            }
        });

        // Etats et Stats
        this.hp = 10;
        this.maxhp = 10;
        this.stamina = 10;
        this.maxStamina = 10;
        
        this.isAttacking = false;
        this.isSliding = false;
        this.isInvulnerable = false;
        this.isStunned = false;
        this.isDead = false;
        this.canSlide = true;

        // Coûts en endurance
        this.staminaKickCost = 1;
        this.staminaRunCost = 1;
        this.staminaAttackCost = 2;
        this.slideStaminaCost = 2;
        
        // Mouvement spécial
        this.slideSpeed = 0;
        this.slideVec = new Phaser.Math.Vector2();
        this.currentWeapon = 'baseball';
        
        // Récupération
        this.lastDamageTime = 0;
        this.regenRate = 0.0001;
        this.regenDelay = 10000;

        this.activeHitbox = null;

        // Initialisation visuelle
        this.createSprite(x, y);
    }

    createSprite(x, y) {
        // Sprite du Héros
        this.sprite = this.scene.add.sprite(x, y, "hero-idle-0").setScale(0.04);
        this.sprite.setOrigin(0.5, 0.8);

        // Sprite de l'Arme (superposé)
        this.weaponSprite = this.scene.add.sprite(x, y, "").setScale(0.04);
        this.weaponSprite.setOrigin(0.5, 0.65);
        this.weaponSprite.setVisible(false);

        const anims = this.scene.anims;

        const createDoubleAnim = (key, length, rate, repeat = -1) => {
            // Animation du Héros
            if (!anims.exists(key)) {
                anims.create({
                    key: key,
                    frames: Array.from({ length }, (_, i) => ({ key: `hero-${key}-${i}` })),
                    frameRate: rate,
                    repeat: repeat
                });
            }
        
            // Animation de l'Arme
            if (this.currentWeapon && this.currentWeapon !== '') {
                const weaponKey = `${this.currentWeapon}-${key}`;
                let textureSuffix = key;
                // Mapping des suffixes de textures pour correspondre au Preload
                if (key === "attack") textureSuffix = "attacking";
                if (key === "walk") textureSuffix = "walking";
                if (key === "run") textureSuffix = "running";
            
                if (this.scene.textures.exists(`${this.currentWeapon}-${textureSuffix}-0`)) {
                    if (!anims.exists(weaponKey)) {
                        anims.create({
                            key: weaponKey,
                            frames: Array.from({ length }, (_, i) => ({ 
                                key: `${this.currentWeapon}-${textureSuffix}-${i}`
                            })),
                            frameRate: rate,
                            repeat: repeat
                        });
                    }
                }
            }
        };

        // Génération de la bibliothèque d'animations
        createDoubleAnim("idle", 18, 20);
        createDoubleAnim("walk", 24, 44);
        createDoubleAnim("run", 12, 24);
        createDoubleAnim("kick", 12, 24, 0);
        createDoubleAnim("attack", 12, 30, 0);
        createDoubleAnim("slide", 6, 20, 0);

        this.playDualAnim("idle");
    }


    update(cursors, keys, delta, collisionBodies) {
        if (this.isDead) return;

        const pointer = this.scene.input.activePointer;
        pointer.updateWorldPoint(this.scene.cameras.main);

        // Regen HP
        const currentTime = this.scene.time.now;
        if (currentTime - this.lastDamageTime > this.regenDelay && this.hp < this.maxhp) {
            this.hp = Math.min(this.maxhp, this.hp + (this.regenRate * delta));
        }

        // Déplacements & actions
        let vx = 0, vy = 0;

        if (!this.isStunned) {
            if (keys.left.isDown) vx = -1;
            else if (keys.right.isDown) vx = 1;
            if (keys.up.isDown) vy = -1;
            else if (keys.down.isDown) vy = 1;

            // Déclenchement du Slide
            if (Phaser.Input.Keyboard.JustDown(keys.ctrl) && this.stamina > this.slideStaminaCost) {
                this.slide(vx, vy);
            }

            // Calcul des vecteurs de vitesse final
            let finalVx, finalVy, currentSpeed;
            if (this.isSliding) {
                finalVx = this.slideVec.x; 
                finalVy = this.slideVec.y;
                currentSpeed = this.slideSpeed * delta;
                this.slideSpeed *= 0.975;
                if (this.slideSpeed < 0.03) { this.isSliding = false; this.slideSpeed = 0; }
            } else {
                const isRunning = keys.shift.isDown && this.stamina > this.staminaRunCost;
                const speed = isRunning ? 0.10 : 0.05;
                currentSpeed = speed * delta * (this.isAttacking ? 0.2 : 1.0);
                finalVx = vx; 
                finalVy = vy;
                
                // Gestion Stamina course
                if (isRunning && (vx !== 0 || vy !== 0)) this.stamina -= 0.003 * delta;
                else this.stamina = Math.min(this.maxStamina, this.stamina + 0.01 * delta);
            }

            // Application de la physique avec détection de collision manuelle
            const tryMove = (dx, dy) => {
                this.scene.matter.body.translate(this.body, { x: dx, y: dy });
                if (this.scene.matter.query.collides(this.body, collisionBodies).length > 0) {
                    this.scene.matter.body.translate(this.body, { x: -dx, y: -dy });
                }
            };
            
            if (finalVx !== 0 || finalVy !== 0) {
                tryMove(finalVx * currentSpeed, 0);
                tryMove(0, finalVy * currentSpeed);
            }

            // Gestion des animations de mouvement
            if (!this.isSliding && !this.isAttacking) {
                if (vx !== 0 || vy !== 0) {
                    const isRunning = keys.shift.isDown && this.stamina > this.staminaRunCost + 1;
                    const anim = isRunning ? "run" : "walk";
                    this.playDualAnim(anim);
                    this.setDualFlip(vx < 0);
                    // Bruitages de pas
                    if (!this.scene.sound.get('step')?.isPlaying) {
                        this.scene.sound.play('step', { volume: 0.1, rate: anim === "run" ? 1.5 : 1.2 });
                    }
                } else {
                    this.playDualAnim("idle");
                }
            }
        }

        // Synchronisation visuelle
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        
        this.weaponSprite.x = this.sprite.x;
        this.weaponSprite.y = this.sprite.y;
        this.weaponSprite.depth = this.sprite.depth - 0.1;
        this.weaponSprite.setFlipX(this.sprite.flipX);

        if (!this.isAttacking && this.currentWeapon === 'baseball') {
            this.weaponSprite.y -= 6;
        }

        if (this.scene.gameMode === 'multi' && !this.isDead) {
            const currentData = {
                x: Math.round(this.sprite.x),
                y: Math.round(this.sprite.y),
                anim: this.sprite.anims.currentAnim?.key,
                flipX: this.sprite.flipX,
                weapon: this.currentWeapon,
                isDead: this.isDead
            };
        
            // On n'envoie que si quelque chose a changé (position ou animation)
            if (this.lastSentData?.x !== currentData.x || 
                this.lastSentData?.y !== currentData.y || 
                this.lastSentData?.anim !== currentData.anim ||
                this.lastSentData?.isDead !== currentData.isDead) {
                
                networkManager.sendAction('playerMovement', currentData);
                this.lastSentData = currentData;
            }
        }
    }

    // Attaque avec l'arme actuelle vers la souris
    attack() {
        if (this.isAttacking || this.isStunned || this.isDead) return;
        const config = WEAPON_CONFIG[this.currentWeapon];
        if (!config) return;

        const pointer = this.scene.input.activePointer;
        this.setDualFlip(pointer.worldX < this.sprite.x);

        this.isAttacking = true;
        this.stamina -= this.staminaAttackCost;
        this.weaponSprite.setVisible(true);
        this.scene.sound.play('punch', { volume: 0.4, detune: Phaser.Math.Between(-200, 200) });
        this.playDualAnim("attack");

        if (this.scene.gameMode === 'multi') {
            networkManager.sendAction('playerAttack', {
                type: 'weapon',
                weapon: this.currentWeapon,
                angle: Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY)
            });
        }

        // Calcul de la position de la Hitbox
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);
        let finalRange = config.range;
        if (angle > 0.5 && angle < 2.5) finalRange *= 0.2;

        const hitboxX = this.sprite.x + Math.cos(angle) * finalRange;
        const hitboxY = this.sprite.y + Math.sin(angle) * finalRange + config.offsetY;

        this.activeHitbox = this.scene.matter.add.circle(hitboxX, hitboxY, config.radius, { 
            isSensor: true, 
            label: 'heroHitbox' 
        });

        this.sprite.once('animationcomplete-attack', () => {
            this.isAttacking = false;
            this.weaponSprite.setVisible(false);
            if (this.activeHitbox) {
                this.scene.matter.world.remove(this.activeHitbox);
                this.activeHitbox = null;
            }
            this.playDualAnim("idle");
        });
    }

    // Coup de pied (attaque rapide sans arme)
    kick() {
        if (this.isAttacking || this.isSliding || this.isStunned || this.isDead) return;

        const config = WEAPON_CONFIG[this.currentWeapon];
        if (!config) return;

        const pointer = this.scene.input.activePointer;
        this.setDualFlip(pointer.worldX < this.sprite.x);

        this.isAttacking = true;
        this.stamina -= this.staminaKickCost;
        this.scene.sound.play('punch', { volume: 0.3, detune: Phaser.Math.Between(-200, 200) });
        this.playDualAnim("kick");

        if (this.scene.gameMode === 'multi') {
            networkManager.sendAction('playerAttack', {
                type: 'kick',
                angle: Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY)
            });
        }

        // Calcul de la position de la Hitbox
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);
        let finalRange = config.range;
        if (angle > 0.5 && angle < 2.5) finalRange *= 0.2;

        const hitboxX = this.sprite.x + Math.cos(angle) * finalRange;
        const hitboxY = this.sprite.y + Math.sin(angle) * finalRange + config.offsetY;

        this.activeHitbox = this.scene.matter.add.circle(hitboxX, hitboxY, config.radius, { 
            isSensor: true, 
            label: 'heroKick' 
        });

        this.sprite.once('animationcomplete-kick', () => {
            this.isAttacking = false;
            if (this.activeHitbox) {
                this.scene.matter.world.remove(this.activeHitbox);
                this.activeHitbox = null;
            }
            this.playDualAnim("idle");
        });
    }

    // Effectue une glissade rapide
    slide(vx, vy) {
        if (!this.canSlide || this.isAttacking || (vx === 0 && vy === 0)) return;
        this.isSliding = true;
        this.canSlide = false;
        this.slideSpeed = 0.45;
        this.stamina -= this.slideStaminaCost;
        this.slideVec.set(vx, vy).normalize();
        this.playDualAnim("slide");
        
        // Cooldown du slide (3s)
        this.scene.time.delayedCall(3000, () => { this.canSlide = true; });
    }

    // Appelé par les ennemis pour infliger des dégâts
    takeDamage(amount, source) {
        if (this.isInvulnerable || this.hp <= 0 || this.isDead) return;

        this.lastDamageTime = this.scene.time.now;
        this.hp -= amount;
        this.isInvulnerable = true;
        this.isStunned = true;

        this.scene.sound.play('hurt', { 
            volume: 0.8,
            detune: Phaser.Math.Between(-200, 200)
         });
        this.sprite.setTint(0xff0000);

        // Knockback
        if (source) {
            const angle = Phaser.Math.Angle.Between(source.x, source.y, this.sprite.x, this.sprite.y);
            this.scene.matter.body.setVelocity(this.body, { 
                x: Math.cos(angle) * 2, 
                y: Math.sin(angle) * 2 
            });
        }

        // Fin de l'étourdissement
        this.scene.time.delayedCall(200, () => { 
            this.isStunned = false; 
            if (!this.isDead) this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        });
        
        // Fin de l'invulnérabilité
        this.scene.time.delayedCall(700, () => {
            this.isInvulnerable = false;
            if (!this.isDead) this.sprite.clearTint();
        });

        if (this.hp <= 0) this.die();
    }

    //  Gère la mort du joueur avec effet de fantôme et changement de scène
    die() {
        if (this.isDead) return;
        this.isDead = true;

        if (this.scene.gameMode === 'multi') {
            networkManager.sendAction('playerMovement', {
                x: Math.round(this.sprite.x),
                y: Math.round(this.sprite.y),
                anim: 'idle', // ou une anim de mort
                flipX: this.sprite.flipX,
                weapon: this.currentWeapon,
                isDead: true
            });
        }

        if (this.body) {
            this.body.collisionFilter.category = 0;
            this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        }

        this.sprite.anims.stop();

        this.scene.sound.play('death-player', { volume: 0.5 });
        this.weaponSprite.setVisible(false);
        this.sprite.setTint(0x333333);
        this.sprite.setAngle(90); // Le perso "tombe"

        // Effet de fantôme qui monte au ciel
        const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key);
        ghost.setScale(this.sprite.scaleX).setAlpha(0.5).setTint(0xffffff);
        ghost.setDepth(this.sprite.depth + 1);

        this.scene.tweens.add({
            targets: ghost,
            y: ghost.y - 150,
            alpha: 0,
            scale: ghost.scaleX * 1.5,
            duration: 2500,
            ease: 'Linear',
            onComplete: () => {
                ghost.destroy();
                if (this.body) {
                    this.scene.matter.world.remove(this.body);
                    this.body = null; 
                }
                // Transition vers l'écran de Game Over
                this.scene.scene.launch('DeathScene', { origin: this.scene.scene.key });
                this.scene.scene.pause();
            }
        });
    }

    // Joue simultanément l'animation du corps et de l'arme
    playDualAnim(key) {
        this.sprite.play(key, true);
        if (this.currentWeapon) {
            const weaponKey = `${this.currentWeapon}-${key}`;
            if (this.scene.anims.exists(weaponKey)) {
                this.weaponSprite.setVisible(true);
                this.weaponSprite.play(weaponKey, true);
            } else {
                this.weaponSprite.setVisible(false);
            }
        }
    }

    // Oriente le héros et l'arme vers la gauche ou la droite
    setDualFlip(isFlipped) {
        this.sprite.setFlipX(isFlipped);
        this.weaponSprite.setFlipX(isFlipped);
    }

    // Change l'arme équipée
    changeWeapon(weaponKey) {
        this.currentWeapon = weaponKey;
        if (this.weaponSprite) {
            if (!weaponKey || weaponKey === '') {
                this.weaponSprite.setVisible(false);
            } else {
                this.weaponSprite.setVisible(true);
                const currentAnimKey = (this.sprite.anims && this.sprite.anims.currentAnim) 
                    ? this.sprite.anims.currentAnim.key 
                    : "idle";
                this.playDualAnim(currentAnimKey);
            }
        }
    }
}