export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.tilemapTiledJSON("map", "./assets/map.tmj");
    this.load.image("tiles", "./assets/exterior.png");
    this.load.image("hero", "./assets/hero.png");

  }

  create() {
    window.gameScene = this;

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("exte", "tiles");

    const obstacle0 = map.createLayer("Obstacle0", tileset, 0, 0); 
    const obstacle1 = map.createLayer("Obstacle1", tileset, 0, 0); 
    const obstacle2 = map.createLayer("Obstacle2", tileset, 0, 0); 
    const obstacle3 = map.createLayer("Obstacle3", tileset, 0, 0);

    map.createLayer("Ground0", tileset, 0, 0);
    map.createLayer("Ground1", tileset, 0, 0);
    map.createLayer("Ground2", tileset, 0, 0);

    obstacle0.setCollisionByProperty({ collides: true }); 
    obstacle1.setCollisionByProperty({ collides: true }); 
    obstacle2.setCollisionByProperty({ collides: true }); 
    obstacle3.setCollisionByProperty({ collides: true });

    this.hero = this.physics.add.sprite(100, 100, "hero").setScale(0.1);
    this.physics.add.collider(this.hero, obstacle0); 
    this.physics.add.collider(this.hero, obstacle1); 
    this.physics.add.collider(this.hero, obstacle2); 
    this.physics.add.collider(this.hero, obstacle3);

    const above = map.createLayer("Above1", tileset, 0, 0); 
    above.setDepth(10);
  }

  handleAction(action) {
    if (action === "attack") {
      console.log("➡ Animation attaque");
    }
    if (action === "heal") {
      console.log("➡ Animation soin");
    }
    if (action === "bomb") {
      console.log("➡ Animation bombe");
    }
  }

  update() {}
}
