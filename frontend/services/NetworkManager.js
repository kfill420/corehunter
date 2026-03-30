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
    }

    joinRoom(roomId) {
        if (this.socket && this.socket.connected) {
            this.currentRoom = roomId;
            this.socket.emit("joinRoom", roomId);
        }
    }

    // Nouvelle méthode pour écouter le reset des slimes
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
            this.socket.disconnect();
        }
        
        this.socket = io(this.url, {
            autoConnect: true
        });

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
            console.log("Connecté au serveur, demande des données...");
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
            if (scene && scene.sys.isActive()) scene.remotePlayer.remove(playerId);
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
            this.socket.emit("requestPlayers"); 
        }
    }

    sendHit(slimeId, damage) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("hitSlime", { id: slimeId, damage: damage, roomId: this.currentRoom || "default" });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.currentRoom = null;
        this.pendingPlayers = null;
    }
}

export const networkManager = new NetworkManager();