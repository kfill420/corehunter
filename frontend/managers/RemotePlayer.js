export default class RemotePlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.otherPlayers = new Map();
    }

    add(info) {
        if (this.otherPlayers.has(info.playerId)) return;

        const sprite = this.scene.matter.add.sprite(info.x, info.y, 'hero-idle-0');
        sprite.setBody({ type: 'circle', radius: 125 });
        sprite.setScale(0.04);
        sprite.setOrigin(0.5, 0.8);
        sprite.setFixedRotation();
        sprite.setStatic(true);
        sprite.playerId = info.playerId;

        const weaponSprite = this.scene.add.sprite(info.x, info.y, '');
        weaponSprite.setScale(0.04);
        weaponSprite.setOrigin(0.5, 0.65);
        weaponSprite.setVisible(false);

        if (info.isDead) {
            sprite.setAngle(90);
            sprite.setTint(0x333333);
        }

        if (this.scene.sortingGroup) {
            this.scene.sortingGroup.add(sprite);
            this.scene.sortingGroup.add(weaponSprite);
        }
        this.otherPlayers.set(info.playerId, { sprite, weaponSprite });
    }

    update(playerInfo) {
        if (!playerInfo || !playerInfo.playerId) return;
        const remote = this.otherPlayers.get(playerInfo.playerId);
        if (!remote) return;

        const { sprite, weaponSprite } = remote;
        if (!sprite.active || !sprite.texture) return;

        // ← Stocker la position cible au lieu d'appliquer directement
        remote.targetX = playerInfo.x;
        remote.targetY = playerInfo.y;
        remote.targetFlipX = playerInfo.flipX;
        remote.targetAnim = playerInfo.anim;
        remote.targetWeapon = playerInfo.weapon;
        remote.targetIsDead = playerInfo.isDead;
    }

    // Nouvelle méthode appelée dans gameScene.update()
    interpolate() {
        this.otherPlayers.forEach((remote) => {
            if (!remote.sprite.active) return;
            const { sprite, weaponSprite } = remote;

            if (remote.targetX === undefined) return;

            const lerpFactor = 0.1;

            sprite.setPosition(
                Phaser.Math.Linear(sprite.x, remote.targetX, lerpFactor),
                Phaser.Math.Linear(sprite.y, remote.targetY, lerpFactor)
            );

            weaponSprite.setPosition(sprite.x, sprite.y);
            weaponSprite.setDepth(sprite.depth - 0.1);
            weaponSprite.setFlipX(sprite.flipX);

            if (remote.targetIsDead) {
                sprite.setAngle(90);
                sprite.setTint(0x333333);
                sprite.anims.stop();
                weaponSprite.setVisible(false);
            } else {
                sprite.setAngle(0);
                sprite.clearTint();
                sprite.setFlipX(remote.targetFlipX);

                if (remote.targetAnim) sprite.play(remote.targetAnim, true);

                if (remote.targetWeapon && remote.targetWeapon !== '') {
                    const weaponKey = `${remote.targetWeapon}-${remote.targetAnim}`;
                    if (this.scene.anims.exists(weaponKey)) {
                        weaponSprite.setVisible(true);
                        weaponSprite.play(weaponKey, true);
                    } else {
                        weaponSprite.setVisible(false);
                    }
                } else {
                    weaponSprite.setVisible(false);
                }

                if (remote.targetWeapon === 'baseball') {
                    const isAttacking = remote.targetAnim?.includes('attack');
                    if (!isAttacking) weaponSprite.y -= 6;
                }
            }
        });
    }

    remove(playerId) {
        const remote = this.otherPlayers.get(playerId);
        if (!remote) return;

        this.otherPlayers.delete(playerId);

        const { sprite, weaponSprite } = remote;

        if (this.scene.sortingGroup) this.scene.sortingGroup.remove(sprite, false);

        sprite.setVisible(false);
        sprite.setActive(false);
        if (sprite.anims) sprite.anims.stop();
        if (sprite.body) {
            this.scene.matter.world.remove(sprite.body);
            sprite.body = null;
        }
        if (sprite.scene) sprite.destroy();
        if (weaponSprite && weaponSprite.scene) weaponSprite.destroy();
    }
}