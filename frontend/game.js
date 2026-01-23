import MainScene from "./scenes/mainScene.js";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("[Game] Connecté au serveur WebSocket");
});

socket.on("user-action", (data) => {
  console.log("[Game] Action reçue :", data);
  window.gameScene?.handleAction(data.action);
});

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: [MainScene]
};

new Phaser.Game(config);
