/**
 * @class NetworkManager
 * @description Gère la communication WebSocket avec le serveur.
 * Centralise les événements réseau pour éviter de polluer les scènes.
 */

class NetworkManager {
    constructor() {
        this.socket = null;
        this.url = "http://localhost:3000";
        this.pendingPlayers = null; // Stockage temporaire
    }

    init(gameInstance) {
        if (this.socket) return; // Évite les doubles connexions
        
        this.socket = io(this.url);

        this.socket.on("currentPlayers", (players) => {
            const scene = gameInstance.scene.getScene('GameScene');
            if (scene && scene.sys.isActive()) {
                scene.spawnRemotePlayers(players);
            } else {
                this.pendingPlayers = players; // On stocke pour plus tard
            }
        });

        this.socket.on("newPlayer", (playerInfo) => {
            const scene = gameInstance.scene.getScene('GameScene');
            if (scene && scene.sys.isActive()) scene.addRemotePlayer(playerInfo);
        });

        this.socket.on("playerMoved", (playerInfo) => {
            const scene = gameInstance.scene.getScene('GameScene');
            if (scene && scene.sys.isActive()) scene.updateRemotePlayer(playerInfo);
        });

        this.socket.on("userDisconnected", (playerId) => {
            const scene = gameInstance.scene.getScene('GameScene');
            if (scene && scene.sys.isActive()) scene.removeRemotePlayer(playerId);
        });
        
    }

    sendAction(movementData) {
        if (this.socket && this.socket.connected) {
            this.socket.emit("playerMovement", movementData);
        }
    }

    requestCurrentPlayers() {
        if (this.socket && this.socket.connected) {
            this.socket.emit("requestPlayers"); 
        }
    }
}

export const networkManager = new NetworkManager();