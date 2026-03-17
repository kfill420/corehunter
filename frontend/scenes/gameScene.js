import Player from '../components/Player.js';
import Slime from '../components/Slime.js'
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';

export default class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }

    init(data) {
        this.gameMode = data.mode || 'solo';
    }

    updateControls() {
        // On récupère les noms des touches sauvegardées
        const up = localStorage.getItem('key_up') || 'Z';
        const down = localStorage.getItem('key_down') || 'S';
        const left = localStorage.getItem('key_left') || 'Q';
        const right = localStorage.getItem('key_right') || 'D';
        const shift = localStorage.getItem('key_shift') || 'SHIFT';
        const ctrl = localStorage.getItem('key_ctrl') || 'CTRL';

        // On crée l'objet de touches
        this.keys = this.input.keyboard.addKeys({
            up: up,
            down: down,
            left: left,
            right: right,
            shift: shift,
            ctrl: ctrl
        });
    }

    preload() {}

    create() {
        // 1. RÉCUPÉRATION ET INJECTION DIRECTE DANS LE CACHE
        const tilemapCache = this.cache.tilemap.get("map");
        if (!tilemapCache) return console.error("Map introuvable dans le cache");

        const mapData = tilemapCache.data; // On modifie la référence directe
        const bushesData = this.cache.json.get("bushes_data");
        const exteriorData = this.cache.json.get("exterior_data");

        if (mapData.tilesets) {
            mapData.tilesets.forEach(ts => {
                if (ts.source) {
                    const src = ts.source.toLowerCase();
                    if (src.includes("bushes") && bushesData) {
                        const fgid = ts.firstgid;
                        Object.assign(ts, bushesData);
                        ts.firstgid = fgid;
                        delete ts.source;
                    } else if (src.includes("exterior") && exteriorData) {
                        const fgid = ts.firstgid;
                        Object.assign(ts, exteriorData);
                        ts.firstgid = fgid;
                        delete ts.source;
                    }
                }
            });
        }

        const map = this.make.tilemap({ key: "map" });

        const tileset = map.addTilesetImage("exterior", "tiles");

        const layers = {};
        const layerNames = [
            "Ground0", "Ground1", "Ground2", 
            "Obstacle0", "Obstacle1", "Obstacle2", 
            "Obstacle3_Collision", "Obstacle3_Visual", "Above1"
        ];

        layerNames.forEach(name => {
            const l = map.createLayer(name, tileset, 0, 0);
            if (l) layers[name] = l;
        });

        if (layers["Obstacle3_Visual"]) layers["Obstacle3_Visual"].setDepth(5000);
        if (layers["Above1"]) layers["Above1"].setDepth(9999);

        const collisionLayers = [
            layers["Obstacle0"], layers["Obstacle1"], 
            layers["Obstacle2"], layers["Obstacle3_Collision"]
        ];

        collisionLayers.forEach(layer => {
            if (layer) {
                layer.setCollisionBetween(1, 10000);
                this.matter.world.convertTilemapLayer(layer);
            }
        });

        // 5. JOUEUR ET OBJETS (Y-Sorting)
        this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

        this.scene.launch('UIScene'); // On s'assure qu'elle est lancée
       const ui = this.scene.get('UIScene');
       
       // On équipe l'arme qui est dans le premier slot de l'inventaire
       if (ui.inventory) {
           this.player.changeWeapon(ui.inventory[ui.selectedSlot]);
       }
        
        // On passe map et non mapData à setupWorld
        this.sortingGroup = setupWorld(this, map); 
        this.sortingGroup.add(this.player.sprite);

        // 6. CAMÉRA ET INPUTS
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player.sprite, false, 0.1, 0.1).setZoom(4);

        // Dans GameScene.js
        this.input.keyboard.on('keydown-ESC', () => {
            // Si la scène de réglages n'est pas déjà ouverte
            if (!this.scene.isActive('SettingsScene')) {
                // On la lance par-dessus, SANS mettre en pause la GameScene
                this.scene.launch('SettingsScene', { origin: this.scene.key });
            } else {
                // Si on appuie sur Echap alors qu'elle est ouverte, on la ferme
                this.scene.stop('SettingsScene');
            }
        });

        // Pour reprendre le jeu quand on ferme les réglages
        this.events.on('resume', () => {
            console.log('Jeu repris');
        });
        
        this.cursors = this.input.keyboard.createCursorKeys();
        // Dans GameScene.js (create)
        this.updateControls();
            
        // Si tu veux que les touches changent sans redémarrer le jeu :
        const settings = this.scene.get('SettingsScene');
        settings.events.on('keyChanged', () => this.updateControls());
        this.input.on("pointerdown", () => {
            if (this.scene.isActive('SettingsScene')) return;

            if ((!this.player.currentWeapon || this.player.currentWeapon === '') && this.player.stamina > this.player.staminaKickCost)
                this.player.kick();
            else if (this.player.stamina > this.player.staminaAttackCost)
                this.player.attack();
        });

        this.input.mouse.disableContextMenu();

        this.scene.run('UIScene');

        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);

        this.enemies = [];

        // On crée le slime et on le stocke dans une variable temporaire
        const firstSlime = new Slime(this, 400, 400, 1);
        const secondSlime = new Slime(this, 400, 400, 2);
        const thirdSlime = new Slime(this, 400, 400, 3);
        this.enemies.push(firstSlime, secondSlime, thirdSlime);

        // const secondSlime = new Slime(this, 400, 400, 3);
        // this.enemies.push(secondSlime);
            
        // On l'ajoute au groupe de tri pour qu'il passe derrière/devant le joueur
        this.sortingGroup.add(firstSlime.sprite, secondSlime.sprite, thirdSlime.sprite);
        // this.sortingGroup.add(secondSlime.sprite);

        // Gestion des dégâts
        this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;

            // Définition des rôles
            const isPlayerA = bodyA.label === 'heroBody';
            const isPlayerB = bodyB.label === 'heroBody';
            const playerBody = isPlayerA ? bodyA : (isPlayerB ? bodyB : null);
            const otherBody = isPlayerA ? bodyB : (isPlayerB ? bodyA : null);

            // --- CAS 1 : LE JOUEUR FRAPPE L'ENNEMI ---
            if (bodyA.label === 'heroHitbox' || bodyA.label === 'heroKick' || 
                bodyB.label === 'heroHitbox' || bodyB.label === 'heroKick') {
                const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;
                const enemyInstance = this.enemies.find(e => e.sprite && e.sprite.body === enemyBody);
                if (enemyInstance) enemyInstance.takeDamage(1);
            }

            // --- CAS 2 : CONTACT PHYSIQUE (Le joueur rentre dans le slime) ---
            if (playerBody && otherBody && otherBody.label === 'enemy') {
                // Ici on a bien otherBody.position car c'est un corps physique
                this.player.takeDamage(1, otherBody.position);
            }
        });
    });
    
    }

    update(time, delta) {
        if (!this.scene.isActive('SettingsScene')) {
            if (this.player) {
                this.player.update(null, this.keys, delta, this.staticBodies);
            }
        } else {
            if (this.player && this.player.body) {
                this.matter.body.setVelocity(this.player.body, { x: 0, y: 0 });
            }
        }

        this.events.emit('updateUI', {
            hp: this.player.hp,
            maxHp: this.player.maxhp,
            stamina: this.player.stamina,
            maxStamina: this.player.maxStamina
        });

        if (this.sortingGroup) applyYSorting(this.sortingGroup, this.player.sprite);

        this.enemies = this.enemies.filter(enemy => {
            if (enemy.sprite && enemy.sprite.active) {
                enemy.update(this.player.sprite, this.staticBodies);
                return true;
            }
        return false;
    });
    }
}