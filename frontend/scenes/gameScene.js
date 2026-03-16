import Player from '../components/Player.js';
import Slime from '../components/Slime.js'
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';

export default class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }

    init(data) {
    // Si data.mode n'existe pas, on met 'solo' par défaut
    this.gameMode = data.mode || 'solo';
    console.log("Démarrage du jeu en mode :", this.gameMode);
}

    preload() {
        this.load.tilemapTiledJSON("map", "./assets/map2.tmj");
        this.load.image("tiles", "./assets/exterior2.png");
        this.load.json("bushes_data", "./assets/Bushes.json");
        this.load.json("exterior_data", "./assets/exterior.json");
        this.load.json("assets", "./assets/objects/assets_manifest.json");

        const loadSlime = (id) => {
            const path = `./assets/mobs/Slimes/${id}/Slime${id}`;
            const config = { frameWidth: 64, frameHeight: 64 };

            this.load.spritesheet(`slime${id}-idle`, `${path}_Idle_without_shadow.png`, config);
            this.load.spritesheet(`slime${id}-run`, `${path}_Run_without_shadow.png`, config);
            this.load.spritesheet(`slime${id}-attack`, `${path}_Attack_without_shadow.png`, config);
            this.load.spritesheet(`slime${id}-hurt`, `${path}_Hurt_without_shadow.png`, config);
            this.load.spritesheet(`slime${id}-death`, `${path}_Death_without_shadow.png`, config);
        };
        [1, 2, 3].forEach(id => loadSlime(id));

        this.load.once("filecomplete-json-assets", () => {
            const data = this.cache.json.get("assets");
            if (data?.images) data.images.forEach(img => this.load.image(img.key, img.url));
        });

        const loadHeroAnims = (key, folder, prefix, count) => {
            for (let i = 0; i <= count; i++) {
                const num = i.toString().padStart(3, "0");
                this.load.image(`hero-${key}-${i}`, `./assets/character/forest_ranger/3/${folder}/0_Forest_Ranger_${prefix}_${num}.png`);
            }
        };

        const loadWeaponAnims = (weaponName, key, folder, prefix, count) => {
            for (let i = 0; i <= count; i++) {
                const num = i.toString().padStart(3, "0");
                this.load.image(`${weaponName}-${key}-${i}`, `./assets/weapons/${weaponName}/${folder}/${prefix}_${num}.png`);
            }
        };

        this.load.audio('step', './assets/sounds/step.mp3');
        this.load.audio('punch', './assets/sounds/punch.mp3');
        this.load.audio('slime-move', './assets/sounds/slime-move.mp3');
        this.load.audio('hurt', './assets/sounds/hurt.mp3');
        this.load.audio('death-player', './assets/sounds/death-player.mp3');
        this.load.audio('death-mob', './assets/sounds/death-mob.mp3');
        this.load.audio('slime-hit', './assets/sounds/slime-hit.mp3');
        this.load.audio('ground-explosion', './assets/sounds/ground-explosion.mp3');
        this.load.audio('metal-bite', './assets/sounds/metal-bite.mp3');
        this.load.audio('slime-splash', './assets/sounds/slime-splash.mp3');

        loadHeroAnims('idle', 'idle', 'Idle', 17);
        loadHeroAnims('walk', 'walking', 'Walking', 23);
        loadHeroAnims('run', 'running', 'Running', 11);
        loadHeroAnims('kick', 'kicking', 'Kicking', 11);
        loadHeroAnims('attack', 'attacking', 'Attacking', 11);
        loadHeroAnims('slide', 'sliding', 'Sliding', 5);

        loadWeaponAnims('baseball', 'attacking', 'Attacking', '0_Forest_Ranger_Baseball', 11);
        loadWeaponAnims('baseball', 'idle', 'idle', '0_Forest_Ranger_Idle', 17);
    }

    create() {
        // 1. RÉCUPÉRATION ET INJECTION DIRECTE DANS LE CACHE
        const tilemapCache = this.cache.tilemap.get("map");
        if (!tilemapCache) return console.error("Map introuvable dans le cache");

        const mapData = tilemapCache.data; // On modifie la référence directe
        const bushesData = this.cache.json.get("bushes_data");
        const exteriorData = this.cache.json.get("exterior_data");

        if (mapData.tilesets) {
            mapData.tilesets.forEach(ts => {
                if (ts.source) {
                    const src = ts.source.toLowerCase();
                    if (src.includes("bushes") && bushesData) {
                        const fgid = ts.firstgid;
                        Object.assign(ts, bushesData);
                        ts.firstgid = fgid;
                        delete ts.source;
                    } else if (src.includes("exterior") && exteriorData) {
                        const fgid = ts.firstgid;
                        Object.assign(ts, exteriorData);
                        ts.firstgid = fgid;
                        delete ts.source;
                    }
                }
            });
        }

        const map = this.make.tilemap({ key: "map" });

        const tileset = map.addTilesetImage("exterior", "tiles");

        const layers = {};
        const layerNames = [
            "Ground0", "Ground1", "Ground2", 
            "Obstacle0", "Obstacle1", "Obstacle2", 
            "Obstacle3_Collision", "Obstacle3_Visual", "Above1"
        ];

        layerNames.forEach(name => {
            const l = map.createLayer(name, tileset, 0, 0);
            if (l) layers[name] = l;
        });

        if (layers["Obstacle3_Visual"]) layers["Obstacle3_Visual"].setDepth(5000);
        if (layers["Above1"]) layers["Above1"].setDepth(9999);

        const collisionLayers = [
            layers["Obstacle0"], layers["Obstacle1"], 
            layers["Obstacle2"], layers["Obstacle3_Collision"]
        ];

        collisionLayers.forEach(layer => {
            if (layer) {
                layer.setCollisionBetween(1, 10000);
                this.matter.world.convertTilemapLayer(layer);
            }
        });

        // 5. JOUEUR ET OBJETS (Y-Sorting)
        this.player = new Player(this, map.widthInPixels / 2, map.heightInPixels / 2);

        this.scene.launch('UIScene'); // On s'assure qu'elle est lancée
       const ui = this.scene.get('UIScene');
       
       // On équipe l'arme qui est dans le premier slot de l'inventaire
       if (ui.inventory) {
           this.player.changeWeapon(ui.inventory[ui.selectedSlot]);
       }
        
        // On passe map et non mapData à setupWorld
        this.sortingGroup = setupWorld(this, map); 
        this.sortingGroup.add(this.player.sprite);

        // 6. CAMÉRA ET INPUTS
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player.sprite, false, 0.1, 0.1).setZoom(4);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("Z,Q,S,D,SHIFT,CTRL");
        this.input.on("pointerdown", () => {

            if ((!this.player.currentWeapon || this.player.currentWeapon === '') && this.player.stamina > this.player.staminaKickCost)
                this.player.kick();
            else if (this.player.stamina > this.player.staminaAttackCost)
                this.player.attack();
        });

        this.input.mouse.disableContextMenu();

        this.scene.run('UIScene');

        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);

        this.enemies = [];

        // On crée le slime et on le stocke dans une variable temporaire
        const firstSlime = new Slime(this, 400, 400, 1);
        const secondSlime = new Slime(this, 400, 400, 2);
        const thirdSlime = new Slime(this, 400, 400, 3);
        this.enemies.push(firstSlime, secondSlime, thirdSlime);

        // const secondSlime = new Slime(this, 400, 400, 3);
        // this.enemies.push(secondSlime);
            
        // On l'ajoute au groupe de tri pour qu'il passe derrière/devant le joueur
        this.sortingGroup.add(firstSlime.sprite, secondSlime.sprite, thirdSlime.sprite);
        // this.sortingGroup.add(secondSlime.sprite);

        // Gestion des dégâts
        this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;

            // Définition des rôles
            const isPlayerA = bodyA.label === 'heroBody';
            const isPlayerB = bodyB.label === 'heroBody';
            const playerBody = isPlayerA ? bodyA : (isPlayerB ? bodyB : null);
            const otherBody = isPlayerA ? bodyB : (isPlayerB ? bodyA : null);

            // --- CAS 1 : LE JOUEUR FRAPPE L'ENNEMI ---
            if (bodyA.label === 'heroHitbox' || bodyA.label === 'heroKick' || 
                bodyB.label === 'heroHitbox' || bodyB.label === 'heroKick') {
                const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;
                const enemyInstance = this.enemies.find(e => e.sprite && e.sprite.body === enemyBody);
                if (enemyInstance) enemyInstance.takeDamage(1);
            }

            // --- CAS 2 : CONTACT PHYSIQUE (Le joueur rentre dans le slime) ---
            if (playerBody && otherBody && otherBody.label === 'enemy') {
                // Ici on a bien otherBody.position car c'est un corps physique
                this.player.takeDamage(1, otherBody.position);
            }
        });
    });
    
    }

    update(time, delta) {
        this.events.emit('updateUI', {
            hp: this.player.hp,
            maxHp: this.player.maxhp,
            stamina: this.player.stamina,
            maxStamina: this.player.maxStamina
        });
        if (this.player) this.player.update(this.cursors, this.keys, delta, this.staticBodies);
        if (this.sortingGroup) applyYSorting(this.sortingGroup, this.player.sprite);
        this.enemies = this.enemies.filter(enemy => {
        if (enemy.sprite && enemy.sprite.active) {
            enemy.update(this.player.sprite, this.staticBodies);
            return true;
        }
        return false;
    });
    }
}