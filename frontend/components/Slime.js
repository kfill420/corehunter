/**
 * @class Slime
 * @description Gère l'IA, les animations directionnelles et les sons spatiaux des ennemis.
 */

import { networkManager } from '../services/NetworkManager.js';

export default class Slime {
    constructor(scene, x, y, type = 1, id) {
        this.scene = scene;
        this.type = type;
        this.id = id;

        // --- 1. CONFIGURATION DES STATS ---
        const stats = {
            1: { hp: 2, damage: 1, speed: 0.15, chaseSpeed: 0.30, range: 18 },
            2: { hp: 2, damage: 1, speed: 0.25, chaseSpeed: 0.45, range: 15 },
            3: { hp: 5, damage: 2, speed: 0.12, chaseSpeed: 0.25, range: 22 },
        };
        const config = stats[type] || stats[1];

        this.targetX = x;
        this.targetY = y;

        // --- 2. ÉTATS & IA ---
        this.hp = config.hp;
        this.damage = config.damage;
        this.baseSpeed = config.speed;
        this.chaseSpeed = config.chaseSpeed;
        this.attackRange = config.range;

        this.isHurt = false;
        this.isDead = false;
        this.isAttacking = false;
        this.lastDir = 'down';

        // --- 3. PHYSIQUE (Matter.js) ---
        this.sprite = scene.matter.add.sprite(x, y, `slime${type}-idle`, 0);
        this.sprite.setScale(0.8);
        this.sprite.setBody({ type: 'circle', radius: 7 }); 
        this.sprite.setFixedRotation();
        // this.sprite.setFrictionAir(0.1);
        this.sprite.setSensor(false);
        this.sprite.body.label = 'enemy'; 

        this.createAnims();

        this.targetX = x;
        this.targetY = y;
        this.idleTimer = 0;
        this.lastDirChangeTime = 0;
    }

    // Crée les animations directionnelles basées sur les spritesheets 
    createAnims() {
        const anims = this.scene.anims;
        const t = this.type;
        const directions = ['down', 'up', 'left', 'right'];

        const configAttack = {
            1: 10,
            2: 11,
            3: 9 
        };
        const attackFramesCount = configAttack[t] || 10;
        
        directions.forEach((dir, rowIndex) => {
            // IDLE
            if (!anims.exists(`slime${t}-idle-${dir}`)) {
                anims.create({
                    key: `slime${t}-idle-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-idle`, { start: rowIndex * 6, end: (rowIndex * 6) + 5 }),
                    frameRate: 8,
                    repeat: -1
                });
            }
            // RUN
            if (!anims.exists(`slime${t}-run-${dir}`)) {
                anims.create({
                    key: `slime${t}-run-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-run`, { start: rowIndex * 8, end: (rowIndex * 8) + 7 }),
                    frameRate: 10,
                    repeat: -1
                });
            }
            // ATTACK
            if (!anims.exists(`slime${t}-attack-${dir}`)) {
                anims.create({
                    key: `slime${t}-attack-${dir}`,
                    frames: anims.generateFrameNumbers(`slime${t}-attack`, { start: rowIndex * attackFramesCount, end: (rowIndex * attackFramesCount) + (attackFramesCount - 1) }),
                    frameRate: 12,
                    repeat: 0
                });
            }
        });

        // DEATH 
        if (!anims.exists(`slime${t}-death`)) {
            anims.create({
                key: `slime${t}-death`,
                frames: anims.generateFrameNumbers(`slime${t}-death`, { start: 0, end: 9 }),
                frameRate: 12,
                repeat: 0
            });
        }
    }

    // Boucle de mise à jour appelée par GameScene
    update() {
        if (this.isDead || !this.sprite || !this.sprite.body) return;

        const lerpFactor = 0.15;
        this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, lerpFactor);
        this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, lerpFactor);
    }

    syncFromServer(serverData) {
    if (this.isDead || serverData.dead) {
        if (!this.isDead) this.die();
        return;
    }

    const dx = serverData.x - this.sprite.x;
    const dy = serverData.y - this.sprite.y;

    this.targetX = serverData.x;
    this.targetY = serverData.y;

    if (this.isAttacking || this.isHurt) return;
    
    if (serverData.isMoving) {
        this.idleTimer = 0;
        this.updateDirectionalAnim({ x: dx, y: dy }, 'run');
        this.handleMoveSounds();
    } else {
        this.idleTimer++;
        if (this.idleTimer > 5) { 
            this.updateDirectionalAnim(null, 'idle');
        }
    }
}

    updateDirectionalAnim(vec, type) {
        if (this.isAttacking && type !== 'attack') return;

        let dir = this.lastDir;

        // 1. DETERMINER LA DIRECTION SOUHAITÉE
        if (vec && (Math.abs(vec.x) > 0.1 || Math.abs(vec.y) > 0.1)) {
            const angle = Phaser.Math.RadToDeg(Math.atan2(vec.y, vec.x));

            // On utilise des seuils fixes pour la clarté
            if (angle >= -135 && angle <= -45) dir = 'up';
            else if (angle > -45 && angle < 45) dir = 'right';
            else if (angle >= 45 && angle <= 135) dir = 'down';
            else dir = 'left';
        }

        const animKey = `slime${this.type}-${type}-${dir}`;
        const currentAnim = this.sprite.anims.currentAnim;

        // 2. CONDITION DE CHANGEMENT
        let canChange = false;
        if (!currentAnim || this.sprite.anims.getName() !== animKey) {
            if (!currentAnim) {
                canChange = true;
            } else {
                if (this.sprite.anims.getProgress() >= 0.5) {
                    canChange = true;
                }
            }
        }

        if (canChange) {
            this.sprite.play(animKey, true);
            this.lastDir = dir;
        }
    }

    handleMoveSounds() {
        const frame = this.sprite.anims.currentFrame?.index;
        // Déclenche le son sur une frame précise de l'anim de course
        if (frame === 4 && !this.hasPlayedMoveSound) {
            const spatial = this.getSpatialConfig();
            this.scene.sound.play('slime-move', { 
                volume: 0.1 * spatial.volumeMod, 
                pan: spatial.pan,
                rate: Phaser.Math.FloatBetween(0.8, 1.2)
            });
            this.hasPlayedMoveSound = true;
        } else if (frame !== 4) {
            this.hasPlayedMoveSound = false;
        }
    }

    attack(targetId) {
    if (this.isAttacking || this.isDead) return;

    const isMe = (networkManager.socket.id === targetId);
    let targetSprite = isMe ? this.scene.player.sprite : this.scene.remotePlayer.otherPlayers.get(targetId);
    
    if (!targetSprite || !targetSprite.active) return;

    // 1. On verrouille l'état tout de suite
    this.isAttacking = true;

    // 2. On calcule la direction vers la cible pour choisir la bonne animation
    const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetSprite.x, targetSprite.y);
    const deg = Phaser.Math.RadToDeg(angle);
    let dir = 'down';
    if (deg >= -135 && deg <= -45) dir = 'up';
    else if (deg > -45 && deg < 45) dir = 'right';
    else if (deg >= 45 && deg <= 135) dir = 'down';
    else dir = 'left';

    this.lastDir = dir;

    // 3. On lance l'animation d'attaque
    this.sprite.play(`slime${this.type}-attack-${dir}`, true);

    // 4. Gestion de l'impact (dégâts/sons)
    const attackFrames = { 1: 6, 2: 7, 3: 4 };
    const impactFrame = attackFrames[this.type] || 5;

    const onUpdate = (anim, frame) => {
        if (frame.index === impactFrame) {
            const sound = this.type === 3 ? 'ground-explosion' : this.type === 2 ? 'metal-bite' : 'slime-splash';
            const spatial = this.getSpatialConfig(); 
            this.scene.sound.play(sound, { volume: 0.2 * spatial.volumeMod, pan: spatial.pan });

            if (isMe) {
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, targetSprite.x, targetSprite.y);
                if (dist < this.attackRange + 15) { 
                    this.scene.player.takeDamage(this.damage || 1, this.sprite);
                }
            }
            this.sprite.off('animationupdate', onUpdate);
        }
    };

    this.sprite.on('animationupdate', onUpdate);

    // 5. On ne libère isAttacking que quand l'animation est TOTALEMENT terminée
    this.sprite.once('animationcomplete', (anim) => {
        if (anim.key.includes('attack')) {
            this.isAttacking = false;
        }
    });
}

    takeDamage(amount) {
        if (this.isHurt || this.isDead) return;

        if (this.scene.gameMode === 'multi')
            networkManager.sendHit(this.id, amount);

        this.isHurt = true;
        this.sprite.setTint(0xff0000);

        const spatial = this.getSpatialConfig(); 
        this.scene.sound.play('slime-hit', { 
            volume: 0.4,
            pan: spatial.pan,
            detune: Phaser.Math.Between(-200, 200)
        });

        this.scene.time.delayedCall(300, () => {
            this.isHurt = false;
            this.sprite.clearTint();
        });


    }

    die() {
        if (this.isDead) return;

        this.isDead = true;
        
        if (this.sprite.body) {
            this.sprite.setStatic(true);
            this.sprite.setSensor(true);
        }

        this.sprite.play(`slime${this.type}-death`, true);
        
        this.scene.sound.play('death-mob', { 
            volume: 0.5,
            rate: Phaser.Math.FloatBetween(0.8, 1.2)
         });

        this.sprite.once('animationcomplete', () => {
            if (this.scene.sortingGroup) {
                this.scene.sortingGroup.remove(this.sprite, false);
            }
            if (this.sprite && this.sprite.scene) {
                this.sprite.destroy();
            }
            this.sprite = null;
        });
    }

    // Calcule le volume et le pan en fonction de la position à l'écran
    getSpatialConfig() {
        const cam = this.scene.cameras.main;
        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, cam.midPoint.x, cam.midPoint.y);
        const volumeMod = Phaser.Math.Clamp(1 - (dist / 350), 0, 1);
        const pan = Phaser.Math.Clamp((this.sprite.x - cam.midPoint.x) / (cam.width / 2), -1, 1);
        return { volumeMod, pan };
    }
}