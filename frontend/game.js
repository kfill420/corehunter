/**
 * @file game.js
 * @description Point d'entrée principal de l'application. 
 * Configure l'instance Phaser et initialise les services globaux.
 */

import MenuScene from "./scenes/menuScene.js";
import GameScene from "./scenes/gameScene.js";
import PreloadScene from "./scenes/preloadScene.js";
import SettingsScene from "./scenes/settingsScene.js";
import UIScene from "./scenes/UIScene.js";
import DeathScene from "./scenes/deathScene.js";
import { networkManager } from "./services/NetworkManager.js";

let webSocketEnable = true;

// Configuration du jeu
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
  scene: [MenuScene, PreloadScene, GameScene, UIScene, SettingsScene, DeathScene]
};

const game = new Phaser.Game(config);

if (webSocketEnable) networkManager.init(game);

export default game;
