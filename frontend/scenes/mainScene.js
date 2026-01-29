export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.tilemapTiledJSON("map", "./assets/map.tmj");
    this.load.image("tiles", "./assets/exterior.png");

    for (let i = 0; i <= 17; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-idle-${i}`,
        `./assets/character/forest_ranger/3/idle/0_Forest_Ranger_Idle_${num}.png`
      );
    }

    for (let i = 0; i <= 11; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-run-${i}`,
        `./assets/character/forest_ranger/3/running/0_Forest_Ranger_Running_${num}.png`
      );
    }

      // Dans preload()
    for (let i = 0; i <= 11; i++) { // Ajuste selon le nombre de frames
        const num = i.toString().padStart(3, "0");
        this.load.image(
          `hero-attack-${i}`, 
          `./assets/character/forest_ranger/3/kicking/0_Forest_Ranger_Kicking_${num}.png`);
    }
  }
  
attack() {
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.heroSprite.play("attack");

    // Déterminer la position de la hitbox selon la direction du sprite
    const direction = this.heroSprite.flipX ? -20 : 20;
    
    // Créer une hitbox (capteur invisible)
    const hitbox = this.matter.add.circle(
        this.heroSprite.x + direction, 
        this.heroSprite.y, 
        15, 
        { isSensor: true, label: 'heroHitbox' }
    );

    // Détection des ennemis touchés
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            if (bodyA === hitbox || bodyB === hitbox) {
                const target = bodyA === hitbox ? bodyB : bodyA;
                if (target.label === 'enemy') {
                    console.log("Ennemi touché !");
                    // Appelle ici une fonction target.gameObject.takeDamage()
                }
            }
        });
    });

    // Nettoyage après l'attaque
    this.heroSprite.on('animationcomplete-attack', () => {
        this.isAttacking = false;
        this.matter.world.remove(hitbox);
        this.heroSprite.play("idle");
    });
}

  create() {
    window.gameScene = this;

    this.Matter = Phaser.Physics.Matter.Matter;

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

    this.aboveContainer = this.add.container(0, 0);
    this.aboveContainer.add(above);
    this.aboveContainer.setDepth(9999);

    this.obstacle3Container = this.add.container(0, 0);
    this.obstacle3Container.add(obstacle3Visual);
    this.obstacle3Container.setDepth(5000);

    obstacle0.setCollisionBetween(1, 10000);
    obstacle1.setCollisionBetween(1, 10000);
    obstacle2.setCollisionBetween(1, 10000);
    obstacle3Collision.setCollisionBetween(1, 10000);

    this.matter.world.convertTilemapLayer(obstacle0);
    this.matter.world.convertTilemapLayer(obstacle1);
    this.matter.world.convertTilemapLayer(obstacle2);
    this.matter.world.convertTilemapLayer(obstacle3Collision);

    this.heroSprite = this.add.sprite(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
      "hero-idle-0"
    ).setScale(0.04);

    this.heroSprite.setOrigin(0.5, 0.7);

    this.heroBody = this.matter.add.circle(
      this.heroSprite.x,
      this.heroSprite.y,
      8,
      {
        isSensor: true,
        inertia: Infinity
      }
    );

    this.collisionBodies = this.matter.world.localWorld.bodies.filter(
      (b) => b.isStatic
    );

    this.logicPos = new Phaser.Math.Vector2(this.heroSprite.x, this.heroSprite.y);

    this.anims.create({
      key: "idle",
      frames: Array.from({ length: 18 }, (_, i) => ({
        key: `hero-idle-${i}`
      })),
      frameRate: 20,
      repeat: -1
    });

    this.heroSprite.play("idle");

    this.anims.create({
      key: "run",
      frames: Array.from({ length: 12 }, (_, i) => ({
        key: `hero-run-${i}`
      })),
      frameRate: 24,
      repeat: -1
    });

    this.isAttacking = false;

    this.anims.create({
        key: "attack",
        frames: Array.from({ length: 12 }, (_, i) => ({ key: `hero-attack-${i}` })),
        frameRate: 30,
        repeat: 0
    });

    this.input.keyboard.on("keydown-SPACE", () => {
        this.attack();
    });

    this.cameraTarget = new Phaser.Math.Vector2(this.heroSprite.x, this.heroSprite.y);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.cameraTarget, false, 0.1, 0.1);
    this.cameras.main.roundPixels = false;
    this.cameras.main.setZoom(4);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D");
  }

  update(time, delta) {
    if (this.isAttacking) return;

    const normalizeSpeed = 0.10 * delta;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.Q.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;

    if (this.cursors.up.isDown || this.keys.Z.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;

    if (vx > 0) {
      this.heroSprite.setFlipX(false);
    } else if (vx < 0) {
      this.heroSprite.setFlipX(true);
    }

    if (vx !== 0 || vy !== 0) {
      if (this.heroSprite.anims.currentAnim?.key !== "run") {
        this.heroSprite.play("run");
      }
    } else {
      if (this.heroSprite.anims.currentAnim?.key !== "idle") {
        this.heroSprite.play("idle");
      }
    }

    const Matter = this.Matter;
    const body = this.heroBody;

    const tryMove = (dx, dy) => {
      if (dx === 0 && dy === 0) return;

      Matter.Body.translate(body, { x: dx, y: dy });

      const collisions = Matter.Query.collides(body, this.collisionBodies);
      if (collisions.length > 0) {
        Matter.Body.translate(body, { x: -dx, y: -dy });
      }
    };

    tryMove(vx * normalizeSpeed, 0);
    tryMove(0, vy * normalizeSpeed);

    this.logicPos.x = body.position.x;
    this.logicPos.y = body.position.y;
      
    this.heroSprite.x = this.logicPos.x;
    this.heroSprite.y = this.logicPos.y;
      
    this.cameraTarget.x = this.logicPos.x;
    this.cameraTarget.y = this.logicPos.y;
      
    this.heroSprite.setDepth(this.heroSprite.y);
  }
}
