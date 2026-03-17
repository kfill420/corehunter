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
        this.isDead = false;

        this.hp = 10;
        this.maxhp = 10;
        this.isInvulnerable = false;
        this.stamina=10;
        this.maxStamina=10;
        this.lastDamageTime = 0;
        this.regenRate = 0.0001;
        this.regenDelay = 10000;
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

        // Vérifie si le joueur frappe derrière lui
        const pointer = this.scene.input.activePointer;
        this.setDualFlip(pointer.worldX < this.sprite.x);

        this.isAttacking = true;
        this.stamina -= 1.5;
        this.weaponSprite.setVisible(true);
        this.scene.sound.play('punch', { volume: 0.4, detune: Phaser.Math.Between(-200, 200) });
        this.playDualAnim("attack");

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, pointer.worldX, pointer.worldY);

        let finalRange = config.range;
    
        // On réduit la porté vers le bas
        if (angle > 0.5 && angle < 2.5) {
            finalRange *= 0.2; // Réduit la portée de 40% quand on tape vers le bas
        }

        const hitboxX = this.sprite.x + Math.cos(angle) * finalRange;
        const hitboxY = this.sprite.y + Math.sin(angle) * finalRange + config.offsetY;

        // 4. Créer la hitbox avec config.radius
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

    kick() {
        if (this.isAttacking || this.isSliding) return;
        this.isAttacking = true;
        this.stamina -= 1;
        this.scene.sound.play('punch', { volume: 0.3, detune: Phaser.Math.Between(-200, 200) });
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

    // --- DETECTION DES TOUCHES REBINDABLES ---
    // On utilise les noms de propriétés définis dans updateControls() de GameScene
    let vx = 0, vy = 0;
    if (keys.left.isDown) vx = -1;
    else if (keys.right.isDown) vx = 1;
    
    if (keys.up.isDown) vy = -1;
    else if (keys.down.isDown) vy = 1;

    // --- LOGIQUE DE RÉGÉNÉRATION ---
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastDamageTime > this.regenDelay) {
        if (this.hp < this.maxhp) {
            this.hp = Math.min(this.maxhp, this.hp + (this.regenRate * delta));
        }
    }

    // --- DÉCLENCHEMENT DES ACTIONS ---
    // Slide : On utilise keys.ctrl défini dynamiquement
    // On utilise JustDown pour éviter de glisser en boucle
    if (Phaser.Input.Keyboard.JustDown(keys.ctrl) && this.stamina > this.slideStaminaCost) {
        this.slide(vx, vy);
    }

    // Note : L'attaque n'est pas ici car elle est gérée par le pointerdown dans GameScene
    // -----------------------------------------

    // --- GESTION DYNAMIQUE DE LA VISÉE ---
    if (this.isAttacking && this.activeHitbox) {
        // ... (ton code actuel de visée reste identique)
    }

    if (this.isStunned) {
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        this.weaponSprite.x = this.sprite.x;
        this.weaponSprite.y = this.sprite.y;
        return; 
    }

    // --- LOGIQUE DE VITESSE ---
    let finalVx, finalVy, currentSpeed;
    if (this.isSliding) {
        finalVx = this.slideVec.x; finalVy = this.slideVec.y;
        currentSpeed = this.slideSpeed * delta;
        this.slideSpeed *= 0.975;
        if (this.slideSpeed < 0.03) { this.isSliding = false; this.slideSpeed = 0; }
    } else {
        // Sprint : On utilise keys.shift défini dynamiquement
        const isRunning = keys.shift.isDown && this.stamina > this.staminaRunCost;
        const speed = isRunning ? 0.10 : 0.05;
        currentSpeed = speed * delta * (this.isAttacking ? 0.2 : 1.0);
        finalVx = vx; finalVy = vy;
        
        if (isRunning) this.stamina -= 0.01;
        else this.stamina = Math.min(this.maxStamina, this.stamina + 0.01);
    }

    // --- ANIMATIONS ---
    if (!this.isSliding && !this.isAttacking) {
        if (vx !== 0 || vy !== 0) {
            // Utilise keys.shift pour l'animation de course
            const isRunning = keys.shift.isDown && this.stamina > this.staminaRunCost + 1;
            const anim = isRunning ? "run" : "walk";
            this.playDualAnim(anim);
            this.setDualFlip(vx < 0);
            if (!this.scene.sound.get('step')?.isPlaying) {
                this.scene.sound.play('step', { volume: 0.2, rate: anim === "run" ? 1.5 : 1.2 });
            }
        } else {
            this.playDualAnim("idle");
        }
    }

    // --- PHYSIQUE ET SYNCHRO ---
    const tryMove = (dx, dy) => {
        this.scene.matter.body.translate(this.body, { x: dx, y: dy });
        if (this.scene.matter.query.collides(this.body, collisionBodies).length > 0) {
            this.scene.matter.body.translate(this.body, { x: -dx, y: -dy });
        }
    };

    tryMove(finalVx * currentSpeed, 0);
    tryMove(0, finalVy * currentSpeed);

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

        this.lastDamageTime = this.scene.time.now;

        this.scene.sound.play('hurt', { 
            volume: 0.8,
            detune: Phaser.Math.Between(-200, 200) 
        });

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
        if (this.isDead) return;
        this.isDead = true;

        this.scene.sound.play('death-player', { volume: 0.5 });
        this.weaponSprite.setVisible(false);
        this.sprite.setTint(0x333333); // Corps au sol devient gris
        this.sprite.setAngle(90);      // Tombe au sol

        // Création du "fantôme"
        const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key);
        ghost.setScale(this.sprite.scaleX).setAlpha(0.5).setTint(0xffffff);

        this.scene.tweens.add({
            targets: ghost,
            y: ghost.y - 150, // S'envole vers le haut
            alpha: 0,         // Disparaît
            scale: ghost.scaleX * 1.5, // Grandit un peu
            duration: 3500,
            ease: 'Linear',
            onComplete: () => {
                ghost.destroy();
                this.scene.scene.launch('DeathScene', { origin: this.scene.scene.key });
                this.scene.scene.pause();
            }
        });

        this.scene.matter.world.remove(this.body);
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