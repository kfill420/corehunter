/**
 * @class GameScene
 * @description Scène principale de gameplay. 
 */

import Player from '../components/Player.js';
import Slime from '../components/Slime.js';
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';
import { networkManager } from '../services/NetworkManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
        this.enemies = [];
        this.staticBodies = [];
        this.otherPlayers = new Map();
    }

    init(data) {
        this.gameMode = data.mode || 'solo';
    }

    create() {
        // Initialisation du dictionnaire des joueurs distants
        this.otherPlayers = new Map();

        // 1. Initialisation de la carte et de la physique
        const map = this._setupMap();
        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);

        // 2. Initialisation du joueur
        this._setupPlayer(map);

        // 3. Initialisation des systèmes (Caméra, Controls, UI)
        this._setupSystems(map);

        // 4. Initialisation des ennemis
        this._spawnEnemies();

        // 5. Gestion des événements globaux
        this._setupCollisionEvents();

        // On récupère le NetworkManager (importé ou global selon ta structure)
        if (this.gameMode === 'multi') {
            if (networkManager.pendingPlayers) {
                this.spawnRemotePlayers(networkManager.pendingPlayers);
                networkManager.pendingPlayers = null; // On vide la file
            }
            networkManager.requestCurrentPlayers();
        }
    }

    update(time, delta) {
        const isPaused = this.scene.isActive('SettingsScene');

        if (!isPaused && this.player) {
            this.player.update(null, this.keys, delta, this.staticBodies);
            this._updateEnemies();

            // ENVOI RÉSEAU
            if (this.gameMode === 'multi' && networkManager.socket) {
                networkManager.sendAction({
                    x: this.player.sprite.x,
                    y: this.player.sprite.y,
                    anim: this.player.sprite.anims.currentAnim?.key,
                    flipX: this.player.sprite.flipX
                });
            }
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

    _spawnEnemies() {
        const types = [1, 2, 3];
        types.forEach((type, index) => {
            const slime = new Slime(this, 400 + (index * 40), 400, type);
            this.enemies.push(slime);
            this.sortingGroup.add(slime.sprite);
        });
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
                        const enemy = this.enemies.find(e => e.sprite?.body === enemyBody);
                        enemy?.takeDamage(1);
                    }
                }

                // Joueur touchant physiquement Ennemi
                const playerBody = bodyA.label === 'heroBody' ? bodyA : (bodyB.label === 'heroBody' ? bodyB : null);
                const enemyBody = bodyA.label === 'enemy' ? bodyA : (bodyB.label === 'enemy' ? bodyB : null);
                
                if (playerBody && enemyBody) {
                    this.player.takeDamage(1, enemyBody.position);
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

    _updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.sprite?.active) {
                enemy.update(this.player.sprite, this.staticBodies);
                return true;
            }
            return false;
        });
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

    // _setupNetworkEvents() {
    //     // 1. Recevoir la liste des joueurs déjà présents
    //     networkManager.socket.on("currentPlayers", (players) => {
    //         Object.keys(players).forEach((id) => {
    //             if (id !== networkManager.socket.id) {
    //                 this.addRemotePlayer(players[id]);
    //             }
    //         });
    //     });
    
    //     // 2. Un nouveau joueur arrive
    //     networkManager.socket.on("newPlayer", (playerInfo) => {
    //         this.addRemotePlayer(playerInfo);
    //     });
    
    //     // 3. Un joueur bouge
    //     networkManager.socket.on("playerMoved", (playerInfo) => {
    //         const remote = this.otherPlayers.get(playerInfo.playerId);
    //         if (remote) {
    //             remote.setPosition(playerInfo.x, playerInfo.y);
    //             if (playerInfo.anim) remote.play(playerInfo.anim, true);
    //             // Gestion du flip (miroir) selon la direction
    //             remote.setFlipX(playerInfo.flipX);
    //         }
    //     });
    
    //     // 4. Un joueur quitte
    //     networkManager.socket.on("userDisconnected", (playerId) => {
    //         const remote = this.otherPlayers.get(playerId);
    //         if (remote) {
    //             remote.destroy();
    //             this.otherPlayers.delete(playerId);
    //         }
    //     });
    // }
    
    // --- À ajouter/modifier dans GameScene.js ---
    
    /**
     * Appelé par NetworkManager pour charger tous les joueurs d'un coup
     */
    spawnRemotePlayers(players) {
        Object.keys(players).forEach((id) => {
            if (id !== networkManager.socket.id) {
                this.addRemotePlayer(players[id]);
            }
        });
    }
    
    /**
     * Appelé pour ajouter UN seul joueur
     */
    addRemotePlayer(info) {
        if (this.otherPlayers.has(info.playerId)) return;
    
        // Utilise une texture par défaut valide (ex: 'hero-idle-0' ou celle du info.anim)
        const remote = this.matter.add.sprite(info.x, info.y, 'hero-idle-0');
        remote.setScale(0.04);
        remote.setOrigin(0.5, 0.8);
        remote.setFixedRotation();
        remote.setStatic(true); 
        remote.playerId = info.playerId;
        
        if (this.sortingGroup) this.sortingGroup.add(remote);
        this.otherPlayers.set(info.playerId, remote);
    }
    
    /**
     * Appelé pour mettre à jour la position et l'animation
     */
    updateRemotePlayer(playerInfo) {
        const remote = this.otherPlayers.get(playerInfo.playerId);
        if (remote) {
            remote.setPosition(playerInfo.x, playerInfo.y);
            if (playerInfo.anim) {
                remote.play(playerInfo.anim, true);
            }
            remote.setFlipX(playerInfo.flipX);
        }
    }
    
    /**
     * Appelé quand un joueur quitte
     */
    removeRemotePlayer(playerId) {
        const remote = this.otherPlayers.get(playerId);
        if (remote) {
            remote.destroy();
            this.otherPlayers.delete(playerId);
        }
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