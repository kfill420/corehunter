import Slime from "../components/Slime.js";

export default class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
    }

    update() {
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.isDead) {
                return enemy.sprite && enemy.sprite.active;
            }

            if (enemy.sprite?.active) {
                enemy.update();
                return true;
            }
            return false;
        });
    }

    sync(serverSlimes) {
        const serverIds = Object.keys(serverSlimes);

        // Nettoyage
        this.enemies = this.enemies.filter(slime => {
            if (!serverIds.includes(slime.id)) {
                slime.sprite.destroy(); // On retire du rendu
                return false;
            }
            return true;
        });

        Object.values(serverSlimes).forEach(data => {
            if (data.dead) {
                const slime = this.enemies.find(e => e.id === data.id);
                if (slime && !slime.isDead) slime.die();
                return;
            }

            let slime = this.enemies.find(e => e.id === data.id);
            
            if (!slime) {
                slime = new Slime(this.scene, data.x, data.y, data.type, data.id);
                this.enemies.push(slime);
                if (this.scene.sortingGroup) this.scene.sortingGroup.add(slime.sprite);
            }
        
            slime.syncFromServer(data);
        });
    }

    handleStatChange(data) {
        const slime = this.enemies.find(e => e.id === data.id);
        if (!slime) return;
    
        if (data.dead) {
            slime.die();
        } else {
            slime.sprite.setTint(0xff0000);
            this.scene.time.delayedCall(200, () => slime.sprite.clearTint());
        }
    }

    handleAction(data) {
        const slime = this.enemies.find(e => e.id === data.id);
        if (!slime) return;
        if (data.action === "ATTACK") {
            slime.attack(data.targetId);
        }
    }
}