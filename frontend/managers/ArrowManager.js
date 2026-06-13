import Arrow from '../components/Arrow.js';
import { networkManager } from '../services/NetworkManager.js';

export default class ArrowManager {
    constructor(scene, angle) {
        this.scene = scene;
        this.angle = angle;
        this.arrows = [];

        // Écouter les flèches des autres joueurs
        networkManager.socket.on('remoteArrow', (data) => {
            const arrow = this.shoot(data.x, data.y, data.angle, data.damage, data.shooterId);
            // Flèche distante = purement visuelle, pas de collision
            if (arrow?.sprite?.body) {
                this.scene.matter.body.set(arrow.sprite.body, 'collisionFilter', {
                    category: 0x0000,
                    mask: 0x0000
                });
            }
        });

        this.scene.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                if (bodyA.label === 'arrow' || bodyB.label === 'arrow') {
                    const arrowBody = bodyA.label === 'arrow' ? bodyA : bodyB;
                    const otherBody = arrowBody === bodyA ? bodyB : bodyA;
                    const arrowRef = arrowBody.arrowRef;
                    if (!arrowRef || arrowRef.isDead) return;

                    // Touche un slime
                    if (otherBody.label === 'enemy') {
                        const enemy = this.scene.enemyManager.enemies.find(e => e.sprite?.body === otherBody);
                        if (enemy) enemy.takeDamage(arrowRef.damage);
                        arrowRef.destroy({ enemyHit: true });
                    }

                    // Touche un mur
                    if (otherBody.isStatic && otherBody.label !== 'remoteHurtbox') {
                        arrowRef.destroy({ enemyHit: false });
                    }

                    // Touche un joueur distant — uniquement si c'est notre flèche
                    if (arrowRef.ownerId === networkManager.socket?.id) {
                        const remoteEntry = [...this.scene.remotePlayer.otherPlayers.values()]
                            .find(r => r.hurtbox === otherBody);
                        if (remoteEntry) {
                            networkManager.sendAction('playerHitPlayer', {
                                targetId: remoteEntry.sprite.playerId,
                                damage: arrowRef.damage,
                                attackerX: arrowRef.sprite?.x,
                                attackerY: arrowRef.sprite?.y,
                                knockbackAngle: arrowRef.angle
                            });
                            arrowRef.destroy({ enemyHit: true });
                        }
                    }
                }
            });
        });
    }

    shoot(x, y, angle, damage, ownerId) {
        const arrow = new Arrow(this.scene, x, y, angle, damage, ownerId);
        this.arrows.push(arrow);
        return arrow;
    }

    update() {
        this.arrows = this.arrows.filter(arrow => {
            if (!arrow.isDead) {
                arrow.update();
                return true;
            }
            return false;
        });
    }

    destroy() {
        this.arrows.forEach(a => a.destroy());
        this.arrows = [];
    }
}