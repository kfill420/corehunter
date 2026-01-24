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
    above.setDepth(10);

    /* =========================
       COLLISIONS
    ========================= */
    obstacle0.setCollisionByProperty({ collides: true }); 
    obstacle1.setCollisionByProperty({ collides: true }); 
    obstacle2.setCollisionByProperty({ collides: true }); 
    obstacle3.setCollisionByProperty({ collides: true });

    /* =========================
       HERO
    ========================= */
    this.hero = this.physics.add.sprite(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      "hero"
    ).setScale(0.1);

    this.hero.setCollideWorldBounds(true);

    this.physics.add.collider(this.hero, obstacle0); 
    this.physics.add.collider(this.hero, obstacle1); 
    this.physics.add.collider(this.hero, obstacle2); 
    this.physics.add.collider(this.hero, obstacle3);

    /* =========================
       WORLD & CAMERA
    ========================= */

    // World bounds = map size
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Camera bounds = map size
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // 🎥 Zoom x2
    this.cameras.main.setZoom(2);

    // Camera follow hero
    this.cameras.main.startFollow(this.hero, true);

    /* =========================
       CONTROLS
    ========================= */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D"); // ZQSD (AZERTY)

    /* =========================
       STATS
    ========================= */
    this.speed = 180; // vitesse joueur

    /* =========================
       DEBUG (optionnel)
    ========================= */
    // this.cameras.main.setBackgroundColor('#000000');
  }

  /* =========================
     SOCKET ACTIONS
  ========================= */
  handleAction(action) {
    if (action === "attack") {
      console.log("➡ Animation attaque");
      // future: this.hero.play("attack")
    }

    if (action === "heal") {
      console.log("➡ Animation soin");
      // future: fx + particules
    }

    if (action === "bomb") {
      console.log("➡ Animation bombe");
      // future: explosion + dégâts zone
    }
  }

  update() {
    const speed = this.speed;

    this.hero.setVelocity(0);

    if (this.cursors.left.isDown || this.keys.Q.isDown) {
      this.hero.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      this.hero.setVelocityX(speed);
    }

    if (this.cursors.up.isDown || this.keys.Z.isDown) {
      this.hero.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      this.hero.setVelocityY(speed);
    }

    // Diagonal normalization (évite speed boost en diagonale)
    this.hero.body.velocity.normalize().scale(speed);
  }
}
