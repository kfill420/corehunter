export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    /* =========================
       MAP
    ========================= */
    this.load.tilemapTiledJSON("map", "./assets/map.tmj");
    this.load.image("tiles", "./assets/exterior.png");

    /* =========================
       HERO IDLE FRAMES
    ========================= */
    for (let i = 0; i <= 17; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-idle-${i}`,
        `./assets/character/forest_ranger/3/idle/0_Forest_Ranger_Idle_${num}.png`
      );
    }
  }

  create() {
    window.gameScene = this;

    /* =========================
       IMPORT MATTER API
    ========================= */
    this.Matter = Phaser.Physics.Matter.Matter;

    /* =========================
       MAP
    ========================= */
    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("exte", "tiles");

    map.createLayer("Ground0", tileset, 0, 0);
    map.createLayer("Ground1", tileset, 0, 0);
    map.createLayer("Ground2", tileset, 0, 0);

    const obstacle0 = map.createLayer("Obstacle0", tileset, 0, 0);
    const obstacle1 = map.createLayer("Obstacle1", tileset, 0, 0);
    const obstacle2 = map.createLayer("Obstacle2", tileset, 0, 0);
    const obstacle3Collision = map.createLayer("Obstacle3_Collision", tileset, 0, 0);
    const obstacle3Visual = map.createLayer("Obstacle3_Visual", tileset, 0, 0);

    const above = map.createLayer("Above1", tileset, 0, 0);

    /* =========================
       DEPTH FIX (containers)
    ========================= */
    this.aboveContainer = this.add.container(0, 0);
    this.aboveContainer.add(above);
    this.aboveContainer.setDepth(9999);

    this.obstacle3Container = this.add.container(0, 0);
    this.obstacle3Container.add(obstacle3Visual);
    this.obstacle3Container.setDepth(5000);

    /* =========================
       COLLISIONS (Matter)
    ========================= */
    obstacle0.setCollisionBetween(1, 10000);
    obstacle1.setCollisionBetween(1, 10000);
    obstacle2.setCollisionBetween(1, 10000);
    obstacle3Collision.setCollisionBetween(1, 10000);

    this.matter.world.convertTilemapLayer(obstacle0);
    this.matter.world.convertTilemapLayer(obstacle1);
    this.matter.world.convertTilemapLayer(obstacle2);
    this.matter.world.convertTilemapLayer(obstacle3Collision);

    /* =========================
       HERO — SPRITE (visuel)
    ========================= */
    this.heroSprite = this.add.sprite(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      "hero-idle-0"
    ).setScale(0.05);

    this.heroSprite.setOrigin(0.5, 0.7);

    /* =========================
       HERO — BODY (sensor + collisions)
    ========================= */
    this.heroBody = this.matter.add.circle(
      this.heroSprite.x,
      this.heroSprite.y,
      8,
      {
        isSensor: true,      // <— sensor : pas de push, pas de rebond
        inertia: Infinity
      }
    );

    /* =========================
       LISTE DES BODIES DE COLLISION
    ========================= */
    // Tous les bodies statiques (tiles) serviront pour les collisions manuelles
    this.collisionBodies = this.matter.world.localWorld.bodies.filter(
      (b) => b.isStatic
    );

    /* =========================
       HERO IDLE ANIMATION
    ========================= */
    this.anims.create({
      key: "idle",
      frames: Array.from({ length: 18 }, (_, i) => ({
        key: `hero-idle-${i}`
      })),
      frameRate: 8,
      repeat: -1
    });

    this.heroSprite.play("idle");

    /* =========================
       CAMERA
    ========================= */
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(this.heroSprite, true, 0.15, 0.15);
    this.cameras.main.roundPixels = true;

    /* =========================
       CONTROLS
    ========================= */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D");

    /* =========================
       STATS
    ========================= */
    this.speed = 0.5; // tu peux monter à 2–3 sans problème
  }

  update() {
    const speed = this.speed;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.Q.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = speed;

    if (this.cursors.up.isDown || this.keys.Z.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = speed;

    const Matter = this.Matter;
    const body = this.heroBody;

    // Petite fonction utilitaire : tente un déplacement, annule s'il y a collision
    const tryMove = (dx, dy) => {
      if (dx === 0 && dy === 0) return;

      Matter.Body.translate(body, { x: dx, y: dy });

      const collisions = Matter.Query.collides(body, this.collisionBodies);
      if (collisions.length > 0) {
        // On annule le mouvement si on touche un mur
        Matter.Body.translate(body, { x: -dx, y: -dy });
      }
    };

    // On teste séparément X puis Y pour un glissement propre le long des murs
    tryMove(vx, 0);
    tryMove(0, vy);

    // Sync sprite → body
    this.heroSprite.x = body.position.x;
    this.heroSprite.y = body.position.y;

    // Depth dynamique
    this.heroSprite.setDepth(this.heroSprite.y);
  }
}
