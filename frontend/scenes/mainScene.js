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

    for (let i = 0; i <= 23; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-walk-${i}`,
        `./assets/character/forest_ranger/3/walking/0_Forest_Ranger_Walking_${num}.png`
      );
    }

    for (let i = 0; i <= 11; i++) {
      const num = i.toString().padStart(3, "0");
      this.load.image(
        `hero-run-${i}`,
        `./assets/character/forest_ranger/3/running/0_Forest_Ranger_Running_${num}.png`
      );
    }

    for (let i = 0; i <= 11; i++) {
        const num = i.toString().padStart(3, "0");
        this.load.image(
          `hero-attack-${i}`, 
          `./assets/character/forest_ranger/3/kicking/0_Forest_Ranger_Kicking_${num}.png`);
    }

    for (let i = 0; i <= 5; i++) {
        const num = i.toString().padStart(3, "0");
        this.load.image(
          `hero-slide-${i}`, 
          `./assets/character/forest_ranger/3/sliding/0_Forest_Ranger_Sliding_${num}.png`);
    }
  }
  
attack(pointer) {
    if (this.isAttacking) return;

    this.isAttacking = true;
    this.heroSprite.play("attack", true);

    const angle = Phaser.Math.Angle.Between(this.heroSprite.x, this.heroSprite.y, pointer.worldX, pointer.worldY);

    this.heroSprite.setFlipX(pointer.worldX < this.heroSprite.x);

    const distance = 10;
    const hx = this.heroSprite.x + Math.cos(angle) * distance;
    const hy = this.heroSprite.y + Math.sin(angle) * distance;
    
    const hitbox = this.matter.add.circle(hx, hy, 5, { 
        isSensor: true, 
        label: 'heroHitbox' 
    });

    this.matter.world.once('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            const other = bodyA === hitbox ? bodyB : (bodyB === hitbox ? bodyA : null);
            
            if (other && other.label === 'enemy') {
                console.log("Ennemi touché dans la direction du clic !");
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

slide(vx, vy) {
    if (!this.canSlide || this.isAttacking) return;
    if (vx === 0 && vy === 0) return;

    this.isSliding = true;
    this.canSlide = false;
    
    this.slideSpeed = 0.45;
    this.slideVec = new Phaser.Math.Vector2(vx, vy).normalize();
    
    this.heroSprite.play("slide", true);

    this.time.delayedCall(3000, () => {
        this.canSlide = true;
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
      key: "walk",
      frames: Array.from({ length: 24 }, (_, i) => ({
        key: `hero-walk-${i}`
      })),
      frameRate: 44,
      repeat: -1
    });

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

    this.anims.create({
      key: "slide",
      frames: Array.from({ length: 6 }, (_, i) => ({ key: `hero-slide-${i}` })),
      frameRate: 20,
      repeat: 0
    });

    this.input.on("pointerdown", (pointer) => {
        if (pointer.leftButtonDown()) {
          this.attack(pointer)
        }
    });

    this.cameraTarget = new Phaser.Math.Vector2(this.heroSprite.x, this.heroSprite.y);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.cameraTarget, false, 0.1, 0.1);
    this.cameras.main.roundPixels = false;
    this.cameras.main.setZoom(4);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("Z,Q,S,D,SHIFT,CTRL");
    this.isSliding = false;
    this.canSlide = true;
    this.slideSpeed = 0;
  }

  update(time, delta) {

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.Q.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;

    if (this.cursors.up.isDown || this.keys.Z.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;

    if (Phaser.Input.Keyboard.JustDown(this.keys.CTRL)) {
      this.slide(vx, vy);
    }

    let finalVx, finalVy, currentSpeed;

    if (this.isSliding) {
      finalVx = this.slideVec.x;
      finalVy = this.slideVec.y;
      currentSpeed = this.slideSpeed * delta;
      this.slideSpeed *= 0.975;
      if (this.slideSpeed < 0.03) {
        this.isSliding = false;
        this.slideSpeed = 0
      }
    } else {
      const isRunning = this.keys.SHIFT.isDown;
      const attackMultiplier = this.isAttacking ? 0.2 : 1.0;
      const baseSpeed = isRunning ? 0.10 : 0.05;
      currentSpeed = baseSpeed * delta * attackMultiplier;
      finalVx = vx;
      finalVy = vy;
    }

    if (this.isSliding) {
        if (this.heroSprite.anims.currentAnim?.key !== "slide") this.heroSprite.play("slide");
    } else if (this.isAttacking) {
        if (this.heroSprite.anims.currentAnim?.key !== "attack") this.heroSprite.play("attack");
    } else {
        if (vx !== 0 || vy !== 0) {
            this.heroSprite.play(this.keys.SHIFT.isDown ? "run" : "walk", true);
        } else {
            this.heroSprite.play("idle", true);
        }
    }

    if (!this.isAttacking && !this.isSliding) {
      if (vx > 0) this.heroSprite.setFlipX(false);
      else if (vx < 0) this.heroSprite.setFlipX(true);
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

    tryMove(finalVx * currentSpeed, 0);
    tryMove(0, finalVy * currentSpeed);

    this.logicPos.x = body.position.x;
    this.logicPos.y = body.position.y;
      
    this.heroSprite.x = this.logicPos.x;
    this.heroSprite.y = this.logicPos.y;
      
    this.cameraTarget.x = this.logicPos.x;
    this.cameraTarget.y = this.logicPos.y;
      
    this.heroSprite.setDepth(this.heroSprite.y);
  }
}
