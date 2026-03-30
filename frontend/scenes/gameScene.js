/**
 * @class GameScene
 * @description Scène principale de gameplay. 
 */

import Player from '../components/Player.js';
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';
import { networkManager } from '../services/NetworkManager.js';
import RemotePlayerManager from '../managers/RemotePlayer.js';
import EnemyManager from '../managers/EnemyManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.staticBodies = [];
    }

    init(data) {
        this.gameMode = data.mode || 'solo';
    }

    create() {
        // 1. Initialisation de la carte et de la physique
        const map = this._setupMap();
        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);

        // 2. Initialisation du joueur
        this._setupPlayer(map);

        this.remotePlayer = new RemotePlayerManager(this);
        this.enemyManager = new EnemyManager(this);

        // 3. Initialisation des systèmes (Caméra, Controls, UI)
        this._setupSystems(map);


        // 5. Gestion des événements globaux
        this._setupCollisionEvents();

        if (this.gameMode === 'multi') {
            networkManager.joinRoom("default");

            if (networkManager.pendingPlayers) {
                this.spawnRemotePlayers(networkManager.pendingPlayers);
                networkManager.pendingPlayers = null;
            }
            networkManager.requestCurrentPlayers();
            networkManager.socket.emit("requestSlimes"); 
        }
    }

    update(time, delta) {
        const isPaused = this.scene.isActive('SettingsScene');

        if (!isPaused && this.player) {
            this.player.update(null, this.keys, delta, this.staticBodies);
            this.enemyManager.update();
        } else {
            if (this.player?.body) this.matter.body.setVelocity(this.player.body, { x: 0, y: 0 });
        }

        // On met à jour l'UI et le tri visuel
        this._dispatchUIUpdate();
        if (this.sortingGroup) applyYSorting(this.sortingGroup, this.player.sprite);
    }

    _setupMap() {
        const tilemapCache = this.cache.tilemap.get("map");
        if (tilemapCache) {
            this._injectTilesetData(tilemapCache.data);
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
            if (l) {
                layers[name] = l;
                if (name.includes("Obstacle")) {
                    l.setCollisionBetween(1, 10000);
                    this.matter.world.convertTilemapLayer(l);
                }
            }
        });

        if (layers["Obstacle3_Visual"]) layers["Obstacle3_Visual"].setDepth(5000);
        if (layers["Above1"]) layers["Above1"].setDepth(9999);

        return map;
    }

    _setupPlayer(map) {
        this.player = new Player(this, (map.widthInPixels / 2) + 50, (map.heightInPixels / 2) + 50);
        
        this.scene.launch('UIScene');
        const ui = this.scene.get('UIScene');
        
        // Synchronisation arme/inventaire
        if (ui.inventory) {
            this.player.changeWeapon(ui.inventory[ui.selectedSlot]);
        }

        this.sortingGroup = setupWorld(this, map); 
        this.sortingGroup.add(this.player.sprite);
    }

    _setupSystems(map) {
        this.updateControls();

        const settings = this.scene.get('SettingsScene');
    
        // Vérification modifications des touches
        settings.events.off('keyChanged');
        settings.events.on('keyChanged', () => {
            console.log("[GameScene] Touches modifiées, actualisation...");
            this.updateControls();

            if (this.player) {
                this.player.keys = this.keys; 
            }
        });
        
        // Caméra
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player.sprite, false, 0.1, 0.1).setZoom(4);

        // Menu Echap
        this.input.keyboard.on('keydown-ESC', () => {
            const settingsActive = this.scene.isActive('SettingsScene');
            settingsActive ? this.scene.stop('SettingsScene') : this.scene.launch('SettingsScene');
        });

        // Click Gauche (Attaque/Kick)
        this.input.on("pointerdown", () => {
            if (this.scene.isActive('SettingsScene')) return;
            this._handlePlayerAttack();
        });

        this.input.mouse.disableContextMenu();
    }

    _setupCollisionEvents() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;
                
                // Joueur frappant Ennemi
                if (bodyA.label.includes('heroHitbox') || bodyB.label.includes('heroHitbox') || 
                    bodyA.label.includes('heroKick') || bodyB.label.includes('heroKick')) {
                    const enemyBody = bodyA.label === 'enemy' ? bodyA : (bodyB.label === 'enemy' ? bodyB : null);
                    if (enemyBody) {
                        const enemy = this.enemyManager.enemies.find(e => e.sprite?.body === enemyBody);
                        enemy?.takeDamage(1);
                    }
                }
            });
        });
    }

    // Utils

    _handlePlayerAttack() {
        const hasNoWeapon = !this.player.currentWeapon || this.player.currentWeapon === '';
        if (hasNoWeapon && this.player.stamina >= this.player.staminaKickCost) {
            this.player.kick();
        } else if (this.player.stamina >= this.player.staminaAttackCost) {
            this.player.attack();
        }
    }

    _dispatchUIUpdate() {
        this.events.emit('updateUI', {
            hp: this.player.hp,
            maxHp: this.player.maxhp,
            stamina: this.player.stamina,
            maxStamina: this.player.maxStamina
        });
    }

    _injectTilesetData(mapData) {
        const bushesData = this.cache.json.get("bushes_data");
        const exteriorData = this.cache.json.get("exterior_data");

        if (!mapData.tilesets) return;

        mapData.tilesets.forEach(ts => {
            if (ts.source) {
                const src = ts.source.toLowerCase();
                const fgid = ts.firstgid;
                if (src.includes("bushes") && bushesData) Object.assign(ts, bushesData);
                else if (src.includes("exterior") && exteriorData) Object.assign(ts, exteriorData);
                ts.firstgid = fgid;
                delete ts.source;
            }
        });
    }

    // Appelé par NetworkManager pour charger tous les joueurs d'un coup
    spawnRemotePlayers(players) {
        Object.keys(players).forEach((id) => {
            if (id !== networkManager.socket.id) {
                this.remotePlayer.add(players[id]);
            }
        });
    }

    updateControls() {
        const keys = ['up', 'down', 'left', 'right', 'shift', 'ctrl'];
        const config = {};
        keys.forEach(k => {
            config[k] = localStorage.getItem(`key_${k}`) || this._getDefaultKey(k);
        });
        this.keys = this.input.keyboard.addKeys(config);
    }

    _getDefaultKey(key) {
        const defaults = { up: 'Z', down: 'S', left: 'Q', right: 'D', shift: 'SHIFT', ctrl: 'CTRL' };
        return defaults[key];
    }
}