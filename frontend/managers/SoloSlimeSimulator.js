/**
 * @class SoloSlimeSimulator
 * @description Réplique locale de l'IA serveur (backend/services/entityManager.js) pour le mode solo.
 * Alimente l'EnemyManager via les mêmes méthodes que le réseau (sync, handleAction, handleStatChange).
 */

export const SOLO_PLAYER_ID = 'local';

const STATS = {
    1: { hp: 4, speed: 0.03, chaseSpeed: 0.05, range: 18 },
    2: { hp: 4, speed: 0.05, chaseSpeed: 0.06, range: 15 },
    3: { hp: 10, speed: 0.02, chaseSpeed: 0.03, range: 22 },
};

export default class SoloSlimeSimulator {
    constructor(scene, enemyManager, slimeCount = 3) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.slimes = {};

        for (let i = 0; i < slimeCount; i++) {
            const id = `slime_solo_${i}`;
            const type = (i % 3) + 1;
            this.slimes[id] = {
                id,
                type,
                x: 300 + Math.random() * 400,
                y: 300 + Math.random() * 400,
                hp: STATS[type].hp,
                stats: STATS[type],
                state: "WANDER",
                detectionRange: 100,
                nextDecisionTime: 0,
                wanderVec: { x: 0, y: 0 },
                dead: false
            };
        }
    }

    isColliding(x, y) {
        const map = this.scene.cameras.main.getBounds();
        if (x < 0 || y < 0 || x > map.width || y > map.height) return true;
        return this.scene.matter.query.point(this.scene.staticBodies, { x, y }).length > 0;
    }

    update(delta) {
        const now = this.scene.time.now;
        const player = this.scene.player;
        const target = (player && !player.isDead) ? { x: player.sprite.x, y: player.sprite.y } : null;

        Object.values(this.slimes).forEach(slime => {
            if (slime.dead || slime.isAttacking) return;

            const dist = target ? Math.hypot(target.x - slime.x, target.y - slime.y) : Infinity;
            slime.state = dist < slime.detectionRange ? "CHASE" : "WANDER";

            const attackRange = slime.stats.range || 20;
            if (dist < attackRange) {
                slime.isAttacking = true;
                slime.state = "ATTACKING";
                slime.isMoving = false;
                this.enemyManager.handleAction({ id: slime.id, action: "ATTACK", targetId: SOLO_PLAYER_ID });
                this.scene.time.delayedCall(1000, () => {
                    slime.isAttacking = false;
                    slime.state = "CHASE";
                });
                return;
            }

            let moveVec = { x: 0, y: 0 };
            let currentSpeed = slime.stats.speed;

            if (slime.state === "CHASE") {
                currentSpeed = slime.stats.chaseSpeed;
                if (dist > (slime.isMoving ? 10 : 15)) {
                    const angle = Math.atan2(target.y - slime.y, target.x - slime.x);
                    moveVec = { x: Math.cos(angle), y: Math.sin(angle) };
                }
            } else {
                if (now > slime.nextDecisionTime) {
                    if (Math.random() > 0.6) {
                        slime.wanderVec = { x: 0, y: 0 };
                    } else {
                        const angle = Math.random() * Math.PI * 2;
                        slime.wanderVec = { x: Math.cos(angle), y: Math.sin(angle) };
                    }
                    slime.nextDecisionTime = now + (2000 + Math.random() * 2000);
                }
                moveVec = slime.wanderVec;
            }

            if (moveVec.x === 0 && moveVec.y === 0) {
                slime.isMoving = false;
                return;
            }

            const finalVec = { x: moveVec.x, y: moveVec.y };

            // Contournement d'obstacle pendant la poursuite
            if (slime.state === "CHASE" && this.isColliding(slime.x + finalVec.x * 20, slime.y + finalVec.y * 20)) {
                const currentAngle = Math.atan2(moveVec.y, moveVec.x);
                const offsets = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI / 1.5, -Math.PI / 1.5];
                const free = offsets.find(o =>
                    !this.isColliding(slime.x + Math.cos(currentAngle + o) * 30, slime.y + Math.sin(currentAngle + o) * 30));

                if (free !== undefined) {
                    finalVec.x = Math.cos(currentAngle + free);
                    finalVec.y = Math.sin(currentAngle + free);
                } else if (!this.isColliding(slime.x + moveVec.x * 25, slime.y)) {
                    finalVec.y = 0;
                } else if (!this.isColliding(slime.x, slime.y + moveVec.y * 25)) {
                    finalVec.x = 0;
                }
            }

            const radius = 8;
            const nextX = slime.x + finalVec.x * currentSpeed * delta;
            const nextY = slime.y + finalVec.y * currentSpeed * delta;

            if (!this.isColliding(nextX + (finalVec.x > 0 ? radius : -radius), slime.y)) {
                slime.x = nextX;
            } else if (slime.state === "WANDER") {
                slime.nextDecisionTime = 0;
            }

            if (!this.isColliding(slime.x, nextY + (finalVec.y > 0 ? radius : -radius))) {
                slime.y = nextY;
            } else if (slime.state === "WANDER") {
                slime.nextDecisionTime = 0;
            }

            slime.isMoving = true;
        });

        this._separateSlimes();
        this.enemyManager.sync(this.slimes);
    }

    hit(id, damage) {
        const slime = this.slimes[id];
        if (!slime || slime.dead) return;

        slime.hp -= damage;
        if (slime.hp <= 0) {
            slime.dead = true;
            this.enemyManager.handleStatChange({ id, dead: true });
            this.scene.time.delayedCall(3000, () => delete this.slimes[id]);
        } else {
            this.enemyManager.handleStatChange({ id, hp: slime.hp, dead: false });
        }
    }

    _separateSlimes() {
        const slimes = Object.values(this.slimes).filter(s => !s.dead);
        const minDist = 20;

        for (let i = 0; i < slimes.length; i++) {
            for (let j = i + 1; j < slimes.length; j++) {
                const a = slimes[i];
                const b = slimes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);

                if (dist < minDist && dist > 0) {
                    const overlap = (minDist - dist) / 2;
                    a.x -= (dx / dist) * overlap;
                    a.y -= (dy / dist) * overlap;
                    b.x += (dx / dist) * overlap;
                    b.y += (dy / dist) * overlap;
                }
            }
        }
    }
}
