export default class Slime {
    constructor(scene, x, y, type = 1) {
        const stats = {
            1: { hp: 2, damage: 1, speed: 0.1, chaseSpeed: 0.25 },
            2: { hp: 2, damage: 1, speed: 0.15, chaseSpeed: 0.35 },
            3: { hp: 3, damage: 1, speed: 0.1, chaseSpeed: 0.20 },
        };
        const config = stats[type] || stats[1];

        this.scene = scene;
        this.type = type;
        this.hp = config.hp;
        this.baseSpeed = config.speed;
        this.chaseSpeed = config.chaseSpeed;
        this.isHurt = false;
        this.isDead = false;
        this.state = "WANDER";
        this.nextDecisionTime = 0;
        this.wanderVec = new Phaser.Math.Vector2();
        this.detectionRange = 80;
        this.avoidanceTimer = 0;
        this.detourSide = 1.57;
        this.attackRange = 20;
        this.isAttacking = false;
        this.damage = config.damage;
        this.hasPlayedMoveSound = false;

        // Création du sprite avec Matter
        this.sprite = scene.matter.add.sprite(x, y, `slime${type}-idle`, 0);
        this.sprite.setScale(0.7);
        this.sprite.setBody({ type: 'circle', radius: 5 }); // Hitbox circulaire au centre
        this.sprite.setFixedRotation();
        this.sprite.setFrictionAir(0.1);
        this.sprite.body.label = 'enemy'; // Important pour les collisions dans MainScene

        this.createAnims();
        
        // Direction par défaut (Face = ligne 0)
        this.currentRow = 0; 
    }

    createAnims() {
        const anims = this.scene.anims;
        const t = this.type;
        
        // On crée les animations pour chaque ligne (direction)
        // 0: Face, 1: Dos, 2: Gauche, 3: Droite (ou selon ton PNG)
        const directions = ['down', 'up', 'left', 'right'];
        
        directions.forEach((dir, rowIndex) => {
            // Idle (6 colonnes)
            if (!anims.exists(`slime${t}-idle-${dir}`)) {
                anims.create({
                    key: `slime${t}-idle-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-idle`, { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
            // Run (8 colonnes)
            if (!anims.exists(`slime${t}-run-${dir}`)) {
                anims.create({
                    key: `slime${t}-run-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-run`, { start: rowIndex * 8, end: (rowIndex * 8) + 7 }),
                    frameRate: 10,
                    repeat: -1
                });
            }

            // Attack (10 colonnes)
            if (!anims.exists(`slime${t}-attack-${dir}`)) {
                anims.create({
                    key: `slime${t}-attack-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-attack`, { 
                        start: rowIndex * 10, 
                        end: (rowIndex * 10) + 9 
                    }),
                    frameRate: 12,
                    repeat: 0 // Ne pas boucler l'attaque
                });
            }
        });

        // Animation de mort (10 colonnes - On prend souvent la ligne de face)
        if (!anims.exists(`slime${t}-death`)) {
            anims.create({
                key: `slime${t}-death`,
                frames: anims.generateFrameNumbers(`slime${t}-death`, { start: 0, end: 9 }),
                frameRate: 12,
                repeat: 0
            });
        }
    }

    update(playerSprite, staticBodies) {
        if (this.isDead || this.isHurt || this.isAttacking) return;

        const distanceToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        const time = this.scene.time.now;

        // --- MACHINE À ÉTATS ---
        if (distanceToPlayer < this.attackRange) {
            this.attack(playerSprite);
            return;
        }
        else if (distanceToPlayer < this.detectionRange) {
            this.state = 'CHASE';
        } else if (this.state === 'CHASE' && distanceToPlayer > this.detectionRange * 1.5) {
            // Le slime abandonne si le joueur s'éloigne trop
            this.state = 'WANDER';
            this.nextDecisionTime = 0; 
        }

        let moveVec = new Phaser.Math.Vector2(0, 0);
        let speed = 0;

        if (this.state === 'CHASE') {
            // Logique de poursuite
            speed = this.chaseSpeed;
            const targetAngle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
            const rayDistance = 20; // Longueur de "l'antenne"
            const rayX = this.sprite.x + Math.cos(targetAngle) * rayDistance;
            const rayY = this.sprite.y + Math.sin(targetAngle) * rayDistance;

            // On regarde si notre rayon touche un mur
            // On regarde si notre rayon touche un mur
            const isBlocked = this.scene.matter.query.point(staticBodies, { x: rayX, y: rayY }).length > 0;
                
            // Si bloqué OU si on est déjà en train de faire un détour (pendant 500ms)
            if (isBlocked || time < this.avoidanceTimer) {
                if (isBlocked && time > this.avoidanceTimer) {
                    // On déclenche un nouveau détour de 500ms dès qu'on sent un mur
                    this.avoidanceTimer = time + 500; 
                }
                // On applique l'angle de détour au lieu de l'angle direct
                const detourAngle = targetAngle + this.detourSide; 
                moveVec.set(Math.cos(detourAngle), Math.sin(detourAngle));
            } else {
            // Chemin libre
                moveVec.set(Math.cos(targetAngle), Math.sin(targetAngle));
            }
            
        } else {
            // Logique d'errance (WANDER)
            if (time > this.nextDecisionTime) {
                // Décider d'une nouvelle direction ou d'une pause
                const pause = Math.random() > 0.7; // 30% de chance de rester immobile
                if (pause) {
                    this.wanderVec.set(0, 0);
                } else {
                    // Direction aléatoire
                    const randomAngle = Math.random() * Math.PI * 2;
                    this.wanderVec.set(Math.cos(randomAngle), Math.sin(randomAngle));
                }
                this.nextDecisionTime = time + Phaser.Math.Between(1000, 3000); // Prochaine décision dans 1-3s
            }
            moveVec.copy(this.wanderVec);
            speed = this.baseSpeed; // Plus lent quand il erre
        }

        // --- APPLICATION DU MOUVEMENT ---
        if (moveVec.length() > 0) {
            const vx = moveVec.x * speed;
            const vy = moveVec.y * speed;

            // On vérifie les murs avant de valider le déplacement
            this.scene.matter.body.translate(this.sprite.body, { x: vx, y: 0 });
            if (this.scene.matter.query.collides(this.sprite.body, staticBodies).length > 0) {
                this.scene.matter.body.translate(this.sprite.body, { x: -vx, y: 0 });
                if (this.state === 'CHASE') {
                    this.detourSide *= -1;
                    this.avoidanceTimer = time + 500; // On relance le chrono de détour
                }
            }

            this.scene.matter.body.translate(this.sprite.body, { x: 0, y: vy });
            if (this.scene.matter.query.collides(this.sprite.body, staticBodies).length > 0) {
                this.scene.matter.body.translate(this.sprite.body, { x: 0, y: -vy });
                if (this.state === 'CHASE') {
                    this.detourSide *= -1;
                    this.avoidanceTimer = time + 500; // On relance le chrono de détour
                }
            }

            // --- ANIMATIONS ---
            // --- ANIMATIONS ET SONS SYNCHRONISÉS ---
            const angle = Math.atan2(moveVec.y, moveVec.x);
            const deg = Phaser.Math.RadToDeg(angle);
            
            // On ne change de direction que si on bouge vraiment pour éviter les scintillements
            let dir = this.lastDir;
            if (deg >= -135 && deg <= -45) dir = 'up';
            else if (deg > -45 && deg < 45) dir = 'right';
            else if (deg >= 45 && deg <= 135) dir = 'down';
            else dir = 'left';
            
            this.lastDir = dir;
            const animKey = `slime${this.type}-run-${dir}`;

            // On force l'animation
            this.sprite.play(animKey, true);

            // GESTION DU SON : On vérifie la frame sur l'animation ACTUELLE du sprite
            const currentAnim = this.sprite.anims.currentAnim;
            if (currentAnim && currentAnim.key.includes('run')) {
                const currentFrame = this.sprite.anims.currentFrame.index;
                
                // Frame 4 est le moment de l'impact visuel
                if (currentFrame === 4) {
                    if (!this.hasPlayedMoveSound) {
                        const spatial = this.getSpatialConfig();
                        if (spatial.volumeMod > 0) {
                            this.scene.sound.play('slime-move', { 
                                volume: 0.15 * spatial.volumeMod,
                                pan: spatial.pan,
                                rate: Phaser.Math.FloatBetween(0.9, 1.1) 
                            });
                        }
                        this.hasPlayedMoveSound = true;
                    }
                } else {
                    // On ne reset le son que lorsqu'on quitte la frame 4
                    this.hasPlayedMoveSound = false;
                }
            }
            this.sprite.play(animKey, true);
        } else {
            this.sprite.play(`slime${this.type}-idle-down`, true);
            this.sprite.setVelocity(0, 0);
        }
    }

    takeDamage(amount) {
        if (this.isHurt || this.isDead) return;

        this.scene.sound.play('slime-hit', { 
            volume: 0.5, 
            detune: Phaser.Math.Between(-500, 500) 
        });

        this.hp -= amount;
        this.isHurt = true;

        // Feedback visuel
        this.sprite.setTint(0xff0000);
        
        if (this.hp <= 0) {
            this.die();
        } else {
            this.scene.time.delayedCall(300, () => {
                this.isHurt = false;
                this.sprite.clearTint();
            });
        }
    }

    die() {
        this.scene.sound.play('death-mob', { volume: 0.8 });
        this.isDead = true;
        this.sprite.setSensor(true); // Plus de collisions
        this.sprite.setVelocity(0, 0);
        this.sprite.play(`slime${this.type}-death`);
        
        this.sprite.once('animationcomplete', () => {
            this.sprite.destroy();
            // Optionnel : Retirer de la liste des ennemis de la scene
        });
    }

    attack(playerSprite) {
        this.isAttacking = true;
        this.sprite.setVelocity(0, 0);

        const attackConfig = {
            1: { impactFrame: 6, soundKey: 'slime-splash', volume: 0.4 },
            2: { impactFrame: 7, soundKey: 'metal-bite', volume: 0.2 },
            3: { impactFrame: 4, soundKey: 'ground-explosion', volume: 0.4 }
        };
        const config = attackConfig[this.type] || attackConfig[1];

        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
        const deg = Phaser.Math.RadToDeg(angle);
        let dir = (deg >= -135 && deg <= -45) ? 'up' : (deg > -45 && deg < 45) ? 'right' : (deg >= 45 && deg <= 135) ? 'down' : 'left';

        this.sprite.play(`slime${this.type}-attack-${dir}`, true);

        const onUpdate = (anim, frame) => {
            if (frame.index === config.impactFrame) {
                const spatial = this.getSpatialConfig();
                this.scene.sound.play(config.soundKey, { volume: config.volume * spatial.volumeMod, detune: Phaser.Math.Between(-200, 200) });
                
                if (this.type === 3) this.scene.cameras.main.shake(200, 0.0005);

                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);
                if (dist < this.attackRange + 20) this.scene.player.takeDamage(this.damage, this.sprite);
                
                this.sprite.off('animationupdate', onUpdate);
            }
        };

        this.sprite.on('animationupdate', onUpdate);
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            this.sprite.off('animationupdate', onUpdate);
        });
    }

    getSpatialConfig() {
        const cam = this.scene.cameras.main;
        const centerX = cam.worldView.centerX;
        const centerY = cam.worldView.centerY;
        
        // Calcul de la distance entre le slime et le centre de la caméra
        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, centerX, centerY);
        
        // Volume : 1 au centre, 0 à 400 pixels (ajuste 400 selon ton envie)
        const maxDist = 300;
        const volumeMod = Phaser.Math.Clamp(1 - (dist / maxDist), 0, 1);
        
        // Pan : -1 (tout à gauche), 0 (centre), 1 (tout à droite)
        const pan = Phaser.Math.Clamp((this.sprite.x - centerX) / (cam.width / 2), -1, 1);
        
        return { volumeMod, pan };
    }
}