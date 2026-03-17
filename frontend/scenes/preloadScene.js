export default class PreloadScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloadScene' }); }

    preload() {
        const { width, height } = this.scale;

        // --- 1. CRÉATION DE L'INTERFACE DE CHARGEMENT ---
        // Fond de la barre (contour gris)
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Barre de remplissage
        const progressBar = this.add.graphics();

        // Texte de chargement
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Chargement...', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Pourcentage
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // --- 2. ÉVÉNEMENTS DU CHARGEUR ---
        // Se déclenche à chaque fichier chargé
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0x00ffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        // Optionnel : affiche le nom du fichier actuel
        this.load.on('fileprogress', (file) => {
            loadingText.setText('Chargement : ' + file.key);
        });

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
        // Une fois que tout est dans le cache, on lance la GameScene
        // On peut passer les data (mode solo/streamer) reçues du menu
        this.scene.start('GameScene', this.startData);
    }

    init(data) {
        this.startData = data; 
    }
}