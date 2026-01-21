// frontend/game.js

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("[Game] Connecté au serveur WebSocket");
});

socket.on("user-action", (data) => {
  console.log("[Game] Action reçue :", data);
  // Ici tu déclencheras les animations Phaser
});

// Phaser minimal
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  canvas: document.getElementById("game-canvas"),
  scene: {
    preload,
    create,
    update
  }
};

let hero;

function preload() {
  this.load.image("hero", "./assets/hero.png");
}

function create() {
  hero = this.add.sprite(400, 300, "hero");
}

function update() {}

new Phaser.Game(config);
