/**
 * @class NetworkManager
 * @description Gère la communication WebSocket avec le serveur.
 * Centralise les événements réseau pour éviter de polluer les scènes.
 */

class NetworkManager {
    constructor() {
        this.socket = null;
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        this.url = isLocal ? "http://localhost:3001" : "https://corehunter.alexis-vignot.fr";
        this.pendingPlayers = null;
        this.currentRoom = null;
        this.roomPlayers = [];
    }

    createRoom() { this.socket.emit("createRoom"); }
    joinRoom(roomId) { 
        this.socket.emit("joinRoom", roomId.toUpperCase()); 
    }
    startGame(roomId, slimeCount = 3) { 
        this.socket.emit("startGameRequest", { 
            roomId, 
            slimeCount
        }); 
    }

    cleanupLobbyEvents() {
        if (this.socket) {
            this.socket.off("roomCreated");
            this.socket.off("roomJoined");
            this.socket.off("playerJoined");
            this.socket.off("gameStarted");
            this.socket.off("error");
        }
    }

    setupLobbyEvents(lobbyScene) {
        this.cleanupLobbyEvents();
        this.socket.on("roomCreated", (data) => {
            this.currentRoom = data.roomId;
            this.roomPlayers = data.players;
            if (lobbyScene && lobbyScene.sys.isActive()) lobbyScene.updateUI();
        });
        this.socket.on("roomJoined", (data) => {
            this.currentRoom = data.roomId;
            this.roomPlayers = data.players;
            lobbyScene.updateUI();
        });
        this.socket.on("playerJoined", (players) => {
            this.roomPlayers = players;
            lobbyScene.updateUI();
        });
        this.socket.on("gameStarted", (data) => {
            this.cleanupLobbyEvents();
            const me = data.players.find(p => p.id === this.socket.id);
            if (me) {
                this.spawnX = me.spawnX;
                this.spawnY = me.spawnY;
            }
            lobbyScene.launchGame();
        });
        this.socket.on("error", (msg) => alert(msg));
    }

    setupResetListener(gameInstance) {
        this.socket.on("allSlimesReset", (newSlimes) => {
            const scene = gameInstance.scene.getScene('GameScene');
            if (scene && scene.sys.isActive()) {
                scene.enemyManager.sync(newSlimes);
            }
        });
    }

    init(gameInstance) {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.currentRoom = null;
            this.roomPlayers = [],
            this.pendingPlayers = null;
            
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = null;
            }
        }
        
        this.socket = io(this.url, { autoConnect: true });

        const getActiveGameScene = () => {
           return gameInstance.scene.getScene('GameScene');
        };

        this.socket.on("currentPlayers", (players) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.spawnRemotePlayers(players);
            } else {
                this.pendingPlayers = players;
            }
        });

        this.socket.on("connect", () => {
            console.log("Connecté au serveur");
            if (this.currentRoom) {
                this.socket.emit("joinRoom", this.currentRoom);
            }
        });

        this.socket.on("newPlayer", (playerInfo) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) scene.remotePlayer.add(playerInfo);
        });

        this.socket.on("playerMoved", (playerInfo) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) scene.remotePlayer.update(playerInfo);
        });

        this.socket.on("userDisconnected", (playerId) => {
            const scene = getActiveGameScene();
            if (!scene || !scene.sys.isActive() || !scene.remotePlayer) return;
            scene.time.delayedCall(50, () => {
                if (scene.remotePlayer) scene.remotePlayer.remove(playerId);
            });
        });

        this.socket.on("slimeUpdate", (serverSlimes) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.enemyManager.sync(serverSlimes);
            }
        });

        this.socket.on("slimeStatUpdate", (data) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.enemyManager.handleStatChange(data);
            }
        });

        this.socket.on("slimeAction", (data) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.enemyManager.handleAction(data);
            }
        });

        this.socket.on("allSlimesReset", (serverSlimes) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.enemyManager.sync(serverSlimes);
            }
        });

        this.socket.on("playerTookDamage", (data) => {
            const scene = getActiveGameScene();
            if (!scene || !scene.sys.isActive()) return;

            // Si c'est le joueur local qui est touché
            if (data.targetId === this.socket.id) {
                const source = (data.attackerX !== undefined) 
                    ? { x: data.attackerX, y: data.attackerY } 
                    : null;
                        
                const knockbackAngle = (data.knockbackAngle !== undefined && isFinite(data.knockbackAngle))
                    ? data.knockbackAngle
                    : null;
                        
                scene.player.takeDamage(data.damage, source, knockbackAngle);
                return;
            }
        
            // Feedback visuel sur le remote player touché
            const remote = scene.remotePlayer.otherPlayers.get(data.targetId);
            if (remote) {
                remote.sprite.setTint(0xff0000);
                scene.time.delayedCall(200, () => remote.sprite.clearTint());
            }
        });
    }

    sendAction(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, {
                ...data,
                roomId: this.currentRoom || "default"
            });
        }
    }

    requestCurrentPlayers() {
        if (this.socket && this.socket.connected) {
            this.socket.emit("requestPlayers", { roomId: this.currentRoom }); 
        }
    }

    sendHit(slimeId, damage) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("hitSlime", { id: slimeId, damage: damage, roomId: this.currentRoom || "default" });
        }
    }
}

export const networkManager = new NetworkManager();