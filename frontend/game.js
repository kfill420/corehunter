import MenuScene from "./scenes/menuScene.js";
import GameScene from "./scenes/gameScene.js";
import PreloadScene from "./scenes/preloadScene.js";
import SettingsScene from "./scenes/settingsScene.js";
import UIScene from "./components/UIScene.js";
import DeathScene from "./scenes/deathScene.js";

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
      debug: true, 
      gravity: { y: 0 }
    }
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
  scene: [MenuScene, PreloadScene, GameScene, UIScene, SettingsScene, DeathScene]
};

new Phaser.Game(config);
