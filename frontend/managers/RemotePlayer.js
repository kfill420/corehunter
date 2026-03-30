export default class RemotePlayerManager {
    constructor(scene) {
        this.scene = scene;
        this.otherPlayers = new Map();
    }

    add(info) {
        if (this.otherPlayers.has(info.playerId)) return;
    
        const remote = this.scene.matter.add.sprite(info.x, info.y, 'hero-idle-0');
        remote.setScale(0.04);
        remote.setOrigin(0.5, 0.8);
        remote.setFixedRotation();
        remote.setStatic(true); 
        remote.playerId = info.playerId;

        if (info.isDead) {
            remote.setAngle(90);
            remote.setTint(0x333333);
        }
        
        if (this.scene.sortingGroup) this.scene.sortingGroup.add(remote);
        this.otherPlayers.set(info.playerId, remote);
    }

    update(playerInfo) {
        const remote = this.otherPlayers.get(playerInfo.playerId);
        if (remote) {
            remote.setPosition(playerInfo.x, playerInfo.y);
            if (playerInfo.isDead) {
                remote.setAngle(90);
                remote.setTint(0x333333);
                remote.anims.stop();
            } else {
                remote.setAngle(0);
                remote.setTint();
                if (playerInfo.anim) {
                    remote.play(playerInfo.anim, true);
                }
            }
            remote.setFlipX(playerInfo.flipX);
        }
    }

    remove(playerId) {
        const remote = this.otherPlayers.get(playerId);
        if (remote) {
            remote.destroy();
            this.otherPlayers.delete(playerId);
        }
    }
}