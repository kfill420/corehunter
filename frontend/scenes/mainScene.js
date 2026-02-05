import Player from '../components/Player.js';
import { setupWorld, applyYSorting } from '../components/WorldUtils.js';

export default class MainScene extends Phaser.Scene {
    constructor() { super("MainScene"); }

    preload() {
        this.load.tilemapTiledJSON("map", "./assets/map2.tmj");
        this.load.image("tiles", "./assets/exterior2.png");
        this.load.json("bushes_data", "./assets/Bushes.json");
        this.load.json("exterior_data", "./assets/exterior.json");
        this.load.json("assets", "./assets/objects/assets_manifest.json");

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
        loadHeroAnims('idle', 'idle', 'Idle', 17);
        loadHeroAnims('walk', 'walking', 'Walking', 23);
        loadHeroAnims('run', 'running', 'Running', 11);
        loadHeroAnims('attack', 'kicking', 'Kicking', 11);
        loadHeroAnims('slide', 'sliding', 'Sliding', 5);
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

        // 2. CRÉATION DE LA MAP VIA LA CLÉ (Maintenant que le cache est patché)
        const map = this.make.tilemap({ key: "map" });
        
        // On vérifie si Phaser voit enfin les calques
        console.log("Calques détectés par Phaser :", map.getTileLayerNames());

        // 3. INITIALISATION DES TILESETS ET CALQUES
        // Assure-toi que "exterior" est bien le nom du tileset dans Tiled
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

        // 4. PHYSIQUE MATTER (Tilemaps)
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
        
        // On passe map et non mapData à setupWorld
        this.sortingGroup = setupWorld(this, map); 
        this.sortingGroup.add(this.player.sprite);

        // 6. CAMÉRA ET INPUTS
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(this.player.sprite, false, 0.1, 0.1).setZoom(4);
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("Z,Q,S,D,SHIFT,CTRL");
        this.input.on("pointerdown", (p) => this.player.attack(p));

        this.staticBodies = this.matter.world.localWorld.bodies.filter(b => b.isStatic);
    }

    update(time, delta) {
        if (this.player) this.player.update(this.cursors, this.keys, delta, this.staticBodies);
        if (this.sortingGroup) applyYSorting(this.sortingGroup, this.player.sprite);
    }
}