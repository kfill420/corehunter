import WEAPON_CONFIG from './WeaponConfig.js';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        this.body = scene.matter.add.circle(x, y + 10, 5, {
            isSensor: false,
            inertia: Infinity,
            frictionAir: 0.1,
            label: 'heroBody',
            collisionFilter: {
                category: 0x0002,
                mask: 0x0001 // Ne collisionne physiquement qu'avec les murs (si tes murs sont en catégorie 1)
            }
        });

        this.staminaKickCost = 1;
        this.staminaRunCost = 1;
        this.isAttacking = false;
        this.staminaAttackCost = 2;
        this.isSliding = false;
        this.slideStaminaCost = 2;
        this.canSlide = true;
        this.slideSpeed = 0;
        this.slideVec = new Phaser.Math.Vector2();
        this.currentWeapon = 'baseball';
        this.weaponSprite = null;
        this.activeHitbox = null;

        this.hp = 10;
        this.maxhp = 10;
        this.isInvulnerable = false;

        this.stamina=10;
        this.maxStamina=10;
        this.createSprite(x, y);
    }

    createSprite(x, y) {
        this.sprite = this.scene.add.sprite(x, y, "hero-idle-0").setScale(0.04);
        this.sprite.setOrigin(0.5, 0.8);

        // Initialise le sprite de l'arme (vide au début)
        this.weaponSprite = this.scene.add.sprite(x, y, "").setScale(0.04);
        this.weaponSprite.setOrigin(0.5, 0.65);
        this.weaponSprite.setVisible(false);

        const anims = this.scene.anims;

        const createDoubleAnim = (key, length, rate, repeat = -1) => {
            // 1. Animation du Héros (toujours créée)
            if (!anims.exists(key)) {
                anims.create({
                    key: key,
                    frames: Array.from({ length }, (_, i) => ({ key: `hero-${key}-${i}` })),
                    frameRate: rate,
                    repeat: repeat
                });
            }
        
            // 2. Animation de l'Arme (Sécurisée)
            if (this.currentWeapon && this.currentWeapon !== '') {
                const weaponKey = `${this.currentWeapon}-${key}`;

                let textureSuffix = key;
                if (key === "attack") textureSuffix = "attacking";
                if (key === "walk") textureSuffix = "walking";
                if (key === "run") textureSuffix = "running";
            
                // VÉRIFICATION : Est-ce que la frame 0 de cette texture existe ?
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

        createDoubleAnim("idle", 18, 20);
        createDoubleAnim("walk", 24, 44);
        createDoubleAnim("run", 12, 24);
        createDoubleAnim("kick", 12, 24, 0);
        createDoubleAnim("attack", 12, 30, 0);
        createDoubleAnim("slide", 6, 20, 0);

        this.sprite.play("idle");
        if (this.currentWeapon) this.playDualAnim("idle");
    }

    // Remplace tes fonctions par celles-ci
    attack() {
        if (this.isAttacking) return;
        const config = WEAPON_CONFIG[this.currentWeapon];
        if (!config) return;

        this.isAttacking = true;
        this.stamina -= 1.5;
        this.weaponSprite.setVisible(true);
        this.playDualAnim("attack");

        this.activeHitbox = this.scene.matter.add.circle(this.sprite.x, this.sprite.y, config.radius, { 
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

    kick() {
        if (this.isAttacking || this.isSliding) return;
        this.isAttacking = true;
        this.stamina -= 1;

        this.playDualAnim("kick");

        this.activeHitbox = this.scene.matter.add.circle(this.sprite.x, this.sprite.y, 4, { 
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

    slide(vx, vy) {
        if (!this.canSlide || this.isAttacking || (vx === 0 && vy === 0)) return;
        this.isSliding = true;
        this.canSlide = false;
        this.slideSpeed = 0.45;
        this.stamina -= 1;
        this.slideVec.set(vx, vy).normalize();
        this.playDualAnim("slide");
        this.scene.time.delayedCall(3000, () => { this.canSlide = true; });
    }

    update(cursors, keys, delta, collisionBodies) {
        const pointer = this.scene.input.activePointer;
        pointer.updateWorldPoint(this.scene.cameras.main);
        const mouseX = pointer.worldX;
        const mouseY = pointer.worldY;

        let vx = 0, vy = 0;
        if (cursors.left.isDown || keys.Q.isDown) vx = -1;
        else if (cursors.right.isDown || keys.D.isDown) vx = 1;
        if (cursors.up.isDown || keys.Z.isDown) vy = -1;
        else if (cursors.down.isDown || keys.S.isDown) vy = 1;

        // Déclenchement des actions
        if (Phaser.Input.Keyboard.JustDown(keys.CTRL) && this.stamina > this.slideStaminaCost) this.slide(vx, vy);

        // --- GESTION DYNAMIQUE DE LA VISÉE PENDANT L'ACTION ---
        if (this.isAttacking && this.activeHitbox) {
            const isMouseToLeft = mouseX < this.sprite.x;
            this.sprite.setFlipX(isMouseToLeft);
            this.weaponSprite.setFlipX(isMouseToLeft);

            // 2. Calcul de l'angle à partir du buste
            const centerX = this.sprite.x;
            const centerY = this.sprite.y - 10;
            const angle = Phaser.Math.Angle.Between(centerX, centerY, mouseX, mouseY);

            let range, offsetY = 0;
            if (this.activeHitbox.label === 'heroKick') {
                range = 8;
            } else {
                const config = WEAPON_CONFIG[this.currentWeapon];
                range = config.range;
                offsetY = config.offsetY;
            }

            const hx = centerX + Math.cos(angle) * range;
            const hy = centerY + Math.sin(angle) * range + offsetY;

            // On force la position de la hitbox
            this.scene.matter.body.setPosition(this.activeHitbox, { x: hx, y: hy });
        }

        if (this.isStunned) {
            // On synchronise quand même les sprites
            this.sprite.x = this.body.position.x;
            this.sprite.y = this.body.position.y;
            this.weaponSprite.x = this.sprite.x;
            this.weaponSprite.y = this.sprite.y;
            return; 
        }

        // Logique de vitesse
        let finalVx, finalVy, currentSpeed;
        if (this.isSliding) {
            finalVx = this.slideVec.x; finalVy = this.slideVec.y;
            currentSpeed = this.slideSpeed * delta;
            this.slideSpeed *= 0.975;
            if (this.slideSpeed < 0.03) { this.isSliding = false; this.slideSpeed = 0; }
        } else {
            const isRunning = keys.SHIFT.isDown && this.stamina > this.staminaRunCost;
            const speed = isRunning ? 0.10 : 0.05;
            // Ralentissement pendant l'attaque pour plus de réalisme
            currentSpeed = speed * delta * (this.isAttacking ? 0.2 : 1.0);
            finalVx = vx; finalVy = vy;
            if (isRunning) 
                this.stamina -= 0.01
            else 
                this.stamina = Math.min(this.maxStamina, this.stamina + 0.01)
        }

        // Animation de déplacement (seulement si on n'attaque pas et ne glisse pas)
        if (!this.isSliding && !this.isAttacking) {
            if (vx !== 0 || vy !== 0) {
                const anim = (keys.SHIFT.isDown && this.stamina > this.staminaRunCost +1) ? "run" : "walk";
                this.playDualAnim(anim);
                this.setDualFlip(vx < 0);
            } else {
                this.playDualAnim("idle");
            }
        }

        // Application du mouvement avec collisions
        const tryMove = (dx, dy) => {
            this.scene.matter.body.translate(this.body, { x: dx, y: dy });
            if (this.scene.matter.query.collides(this.body, collisionBodies).length > 0) {
                this.scene.matter.body.translate(this.body, { x: -dx, y: -dy });
            }
        };

        tryMove(finalVx * currentSpeed, 0);
        tryMove(0, finalVy * currentSpeed);

        // Synchronisation des sprites sur le corps physique
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        this.weaponSprite.x = this.sprite.x;
        this.weaponSprite.y = this.sprite.y;

        this.weaponSprite.depth = this.sprite.depth - 0.1;

        if (!this.isAttacking && this.currentWeapon === 'baseball') {
            this.weaponSprite.y -= 6;
        }
    }

    takeDamage(amount, source) {
        if (this.isInvulnerable || this.hp <= 0) return;

        this.hp -= amount;
        this.isInvulnerable = true;
        this.isStunned = true;

        if (source) {
        // 1. Calculer l'angle entre la source et le joueur
            const angle = Phaser.Math.Angle.Between(source.x, source.y, this.sprite.x, this.sprite.y);
            
            // 2. Créer une force de poussée
            const power = 1; 
        
        // 3. Application IMMEDIATE de la vélocité
        // On utilise setVelocity plutôt que applyForce pour un effet instantané
        this.scene.matter.body.setVelocity(this.body, { 
            x: Math.cos(angle) * power, 
            y: Math.sin(angle) * power 
        });
        }

        // Feedback visuel (clignotement rouge)
        this.sprite.setTint(0xff0000);

        this.scene.time.delayedCall(200, () => { 
            this.isStunned = false; 
            this.scene.matter.body.setVelocity(this.body, { x: 0, y: 0 });
        });
        
        // On retire l'invulnérabilité et le clignotement après 1 seconde
        this.scene.time.delayedCall(700, () => {
            this.isInvulnerable = false;
            this.sprite.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Le joueur est mort !");
        // Tu peux ici stopper la scène, jouer une animation de mort 
        // ou afficher un écran de Game Over
        this.sprite.setTint(0x333333); // Devient gris
        this.scene.matter.world.remove(this.body); // Plus de mouvement physique
    }

    playDualAnim(key) {
        // Joue l'anim du héros
        this.sprite.play(key, true);
        
        if (this.currentWeapon && this.currentWeapon !== '') {
            const weaponKey = `${this.currentWeapon}-${key}`;
            
            // Si l'animation existe pour cette arme, on l'affiche et on la joue
            if (this.scene.anims.exists(weaponKey)) {
                this.weaponSprite.setVisible(true);
                this.weaponSprite.play(weaponKey, true);
            } else {
                // Si l'anim n'existe pas (ex: pas d'anim "kick" pour la batte), on cache
                this.weaponSprite.setVisible(false);
            }
        } else {
            this.weaponSprite.setVisible(false);
        }
    }

    setDualFlip(isFlipped) {
        this.sprite.setFlipX(isFlipped);
        this.weaponSprite.setFlipX(isFlipped);
    }

    setWeapon(newWeaponName) {
        this.currentWeapon = newWeaponName;
        
        // On force la recréation des animations pour la nouvelle arme
        const animKeys = ["idle", "walk", "run", "attack", "slide", "kick"];
        const anims = this.scene.anims;

        animKeys.forEach(key => {
            const weaponKey = `${this.currentWeapon}-${key}`;
            if (!anims.exists(weaponKey)) {
                // On récupère les infos de l'anim du héros pour copier le timing
                const heroAnim = anims.get(key);
                anims.create({
                    key: weaponKey,
                    frames: Array.from({ length: heroAnim.frames.length }, (_, i) => ({ key: `${this.currentWeapon}-${key}-${i}` })),
                    frameRate: heroAnim.frameRate,
                    repeat: heroAnim.repeat
                });
            }
        });

        // On relance l'animation actuelle avec la nouvelle texture
        const currentKey = this.sprite.anims.currentAnim.key;
        this.weaponSprite.play(`${this.currentWeapon}-${currentKey}`);
    }

    changeWeapon(weaponKey) {
       this.currentWeapon = weaponKey;
       
       if (this.weaponSprite) {
           if (!weaponKey || weaponKey === '') {
               this.weaponSprite.setVisible(false);
           } else {
               this.weaponSprite.setVisible(true);
               // On récupère l'anim actuelle du perso pour l'appliquer à l'arme
               const currentAnimKey = this.sprite.anims.currentAnim ? this.sprite.anims.currentAnim.key : "idle";
               this.playDualAnim(currentAnimKey);
           }
       }
    }
}