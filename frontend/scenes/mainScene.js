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

    /* =========================
       MAP
    ========================= */
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("exte", "tiles");

    /* =========================
       LAYERS
    ========================= */
    map.createLayer("Ground0", tileset, 0, 0);
    map.createLayer("Ground1", tileset, 0, 0);
    map.createLayer("Ground2", tileset, 0, 0);

    const obstacle0 = map.createLayer("Obstacle0", tileset, 0, 0);
    const obstacle1 = map.createLayer("Obstacle1", tileset, 0, 0);
    const obstacle2 = map.createLayer("Obstacle2", tileset, 0, 0);
    const obstacle3 = map.createLayer("Obstacle3", tileset, 0, 0);

    const above = map.createLayer("Above1", tileset, 0, 0);

    // On crée un container qui va forcer Phaser à respecter le depth
    this.aboveContainer = this.add.container(0, 0);
    this.aboveContainer.add(above);
      
    // Maintenant le depth fonctionne réellement
    this.aboveContainer.setDepth(9999);


    /* =========================
       COLLISIONS (Matter)
    ========================= */
    obstacle0.setCollisionBetween(1, 10000);
    obstacle1.setCollisionBetween(1, 10000);
    obstacle2.setCollisionBetween(1, 10000);
    obstacle3.setCollisionBetween(1, 10000);

    // Convertit les tiles en bodies Matter
    this.matter.world.convertTilemapLayer(obstacle0);
    this.matter.world.convertTilemapLayer(obstacle1);
    this.matter.world.convertTilemapLayer(obstacle2);
    this.matter.world.convertTilemapLayer(obstacle3);

    /* =========================
       HERO (Matter)
    ========================= */
    this.hero = this.matter.add
      .sprite(
        map.widthInPixels / 2,
        map.heightInPixels / 2,
        "hero"
      )
      .setScale(0.1);

    // Hitbox circulaire (meilleur pour RPG)
    this.hero.setCircle(12);
    this.hero.setFixedRotation(); // empêche la rotation du sprite
    this.hero.setOrigin(0.5, 0.7);

    /* =========================
       WORLD & CAMERA
    ========================= */
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(this.hero, true);

    /* =========================
       CONTROLS
    ========================= */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D");

    /* =========================
       STATS
    ========================= */
    this.speed = 2.2; // vitesse Matter (plus faible que Arcade)

    /* =========================
       DEBUG
    ========================= */
    // this.matter.world.createDebugGraphic();
  }

  /* =========================
     SOCKET ACTIONS
  ========================= */
  handleAction(action) {
    if (action === "attack") console.log("➡ Animation attaque");
    if (action === "heal") console.log("➡ Animation soin");
    if (action === "bomb") console.log("➡ Animation bombe");
  }

  update() {
    const speed = this.speed;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.Q.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;

    if (this.cursors.up.isDown || this.keys.Z.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    this.hero.setVelocity(vx, vy);
    this.hero.setDepth(this.hero.y);

  }
}
