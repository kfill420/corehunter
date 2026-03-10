import UIScene from "./components/UIScene.js";
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
  parent: "game-container",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "matter",
    matter: {
      debug: false, 
      gravity: { y: 0 }
    }
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
  scene: [MainScene, UIScene]
};

new Phaser.Game(config);
