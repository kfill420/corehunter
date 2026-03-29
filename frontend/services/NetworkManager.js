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
                scene.updateEnemiesFromServer(newSlimes);
            }
        });
    }

    init(gameInstance) {
        if (this.socket && this.socket.connected) return;
        if (this.socket) this.socket.disconnect();
        
        this.socket = io(this.url);

        const getActiveGameScene = () => {
           return gameInstance.scene.getScene('GameScene');
        };

        this.socket.on("currentPlayers", (players) => {
            console.log(players);
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
            if (scene && scene.sys.isActive()) scene.addRemotePlayer(playerInfo);
        });

        this.socket.on("playerMoved", (playerInfo) => {
            console.log("Mouvement reçu pour:", playerInfo.playerId);
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) scene.updateRemotePlayer(playerInfo);
        });

        this.socket.on("userDisconnected", (playerId) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) scene.removeRemotePlayer(playerId);
        });

        this.socket.on("slimeUpdate", (serverSlimes) => {
            console.log("Slimes reçus du serveur:", Object.keys(serverSlimes).length);
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.updateEnemiesFromServer(serverSlimes);
            }
        });

        this.socket.on("slimeStatUpdate", (data) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.handleSlimeStatChange(data);
            }
        });

        this.socket.on("slimeAction", (data) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                scene.handleSlimeAction(data);
            }
        });

        this.socket.on("allSlimesReset", (serverSlimes) => {
            const scene = getActiveGameScene();
            if (scene && scene.sys.isActive()) {
                // Cette méthode doit déjà exister dans ta GameScene pour nettoyer les anciens sprites
                scene.updateEnemiesFromServer(serverSlimes);
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
            this.socket.disconnect();
            this.socket = null; // Important pour permettre une réinitialisation future
            this.currentRoom = null;
        }
    }
}

export const networkManager = new NetworkManager();