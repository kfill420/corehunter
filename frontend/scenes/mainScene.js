// frontend/scenes/mainScene.js

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("hero", "../assets/hero.png");
  }

  create() {
    this.hero = this.add.sprite(400, 300, "hero");
  }

  update() {}
}
