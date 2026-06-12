import WEAPON_CONFIG from "./WeaponConfig.js";

export default class Arrow {
    constructor(scene, x, y, angle, damage, ownerId) {
        this.scene = scene;
        this.damage = damage;
        this.ownerId = ownerId;
        this.distanceTraveled = 0;
        this.isDead = false;

        this.sprite = scene.matter.add.image(x, y, 'arrow', null, {
            isSensor: true,
            label: 'arrow',
            frictionAir: 0,
            shape: {
                type: 'circle',
                radius: 4
            }
        });
        this.sprite.setScale(0.04);
        this.sprite.setFixedRotation();
        this.sprite.setAngle(Phaser.Math.RadToDeg(angle));
        this.sprite.setDepth(500);

        // Vélocité constante dans la direction de l'angle
        this.vx = Math.cos(angle) * 8;
        this.vy = Math.sin(angle) * 8;

        this.sprite.setVelocity(this.vx, this.vy);

        // Référence inverse pour retrouver l'Arrow depuis le body
        this.sprite.body.arrowRef = this;
    }

    update() {
        if (this.isDead) return;

        // Matter.js gère le mouvement — juste calculer la distance
        this.distanceTraveled += Math.hypot(this.vx, this.vy);

        if (this.distanceTraveled > WEAPON_CONFIG.bow.projectileRange) {
            this.destroy();
        }
    }

    destroy({ enemyHit = false }= {}) {
        if (this.isDead) return;
        this.isDead = true;

        // Stopper la flèche net
        if (this.sprite && this.sprite.body) {
            this.scene.matter.world.remove(this.sprite.body);
            this.sprite.setVelocity(0, 0);
        }

        if (enemyHit) {
            if (this.sprite && this.sprite.scene) this.sprite.destroy();
            this.sprite = null;
            return;
        }

        // Attendre quelques secondes avant de disparaître
        this.scene.time.delayedCall(2000, () => {
            if (this.sprite && this.sprite.scene) {
                // Fade out avant destruction
                this.scene.tweens.add({
                    targets: this.sprite,
                    alpha: 0,
                    duration: 100,
                    onComplete: () => {
                        if (this.sprite && this.sprite.scene) this.sprite.destroy();
                        this.sprite = null;
                    }
                });
            }
        });
    }
}