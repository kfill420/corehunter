/**
 * @class PreloadScene
 * @description Gère le chargement centralisé des assets. 
 */

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    init(data) {
        this.startData = data;
    }

    preload() {
        const { width, height } = this.scale;

        // 1. UI DE CHARGEMENT
        this._createLoadingUI(width, height);

        // 2. CONFIGURATION DU CHEMIN RACINE
        this.load.setPath('./assets/'); 

        // 3. CHARGEMENT DES FICHIERS DE BASE (MAP & JSON)
        this.load.tilemapTiledJSON("map", "map2.tmj");
        this.load.image("tiles", "exterior2.png");
        this.load.json("bushes_data", "Bushes.json");
        this.load.json("exterior_data", "exterior.json");
        this.load.json("assets_manifest", "objects/assets_manifest.json");

        // 4. CHARGEMENT DU CONTENU DYNAMIQUE (MANIFEST)
        this.load.once("filecomplete-json-assets_manifest", (key, type, data) => {
            if (data?.images) {
                this.load.setPath(''); 
                data.images.forEach(img => {
                    this.load.image(img.key, img.url);
                });
            }
        });

        // 5. CHARGEMENT DES ENTITÉS
        this.load.setPath('./assets/'); 
        this._loadEnemies([1, 2, 3]);
        this._loadHeroAnimations();
        this.load.image('arrow', 'ammo/arrow.png');
        this._loadWeaponAnimations('baseball', [
            { key: 'attacking', folder: 'attacking', prefix: 'baseball_attacking', count: 11 },
            { key: 'idle',      folder: 'idle',      prefix: 'baseball_idle',      count: 17 },
        ]);

        this._loadWeaponAnimations('bow', [
            { key: 'attacking', folder: 'attacking', prefix: 'bow_attacking', count: 0 },
            { key: 'idle',      folder: 'idle',      prefix: 'bow_idle',      count: 0 },
        ]);

        // 6. CHARGEMENT AUDIO
        this._loadAudio();
    }


    _createLoadingUI(width, height) {
        const barWidth = 320;
        const barHeight = 50;
        
        const progressBox = this.add.graphics();
        const progressBar = this.add.graphics();
        
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width / 2 - barWidth / 2, height / 2 - barHeight / 2, barWidth, barHeight, 10);

        const loadingText = this.add.text(width / 2, height / 2 - 60, 'Préparation...', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontSize: '18px',
            fontFamily: 'Arial Black',
            fill: '#00ffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ffff, 1);
            progressBar.fillRoundedRect(width / 2 - (barWidth - 20) / 2, height / 2 - 15, (barWidth - 20) * value, 30, 5);
            percentText.setText(`${Math.floor(value * 100)}%`);
        });

        this.load.on('fileprogress', (file) => {
            loadingText.setText(`Chargement : ${file.key}`);
        });

        this.load.on('complete', () => {
            // Nettoyage propre des objets graphiques
            [progressBar, progressBox, loadingText, percentText].forEach(obj => obj.destroy());
        });
    }

    _loadEnemies(ids) {
        const config = { frameWidth: 64, frameHeight: 64 };
        ids.forEach(id => {
            const path = `mobs/Slimes/${id}/Slime${id}`;
            const anims = ['Idle', 'Run', 'Attack', 'Hurt', 'Death'];
            anims.forEach(anim => {
                this.load.spritesheet(`slime${id}-${anim.toLowerCase()}`, `${path}_${anim}_without_shadow.png`, config);
            });
        });
    }

    _loadHeroAnimations() {
        const heroPath = 'character/forest_ranger/3/';
        const configs = [
            { key: 'idle', folder: 'idle', prefix: 'Idle', count: 17 },
            { key: 'walk', folder: 'walking', prefix: 'Walking', count: 23 },
            { key: 'run', folder: 'running', prefix: 'Running', count: 11 },
            { key: 'kick', folder: 'kicking', prefix: 'Kicking', count: 11 },
            { key: 'attack', folder: 'attacking', prefix: 'Attacking', count: 11 },
            { key: 'slide', folder: 'sliding', prefix: 'Sliding', count: 5 }
        ];

        configs.forEach(cfg => {
            for (let i = 0; i <= cfg.count; i++) {
                const num = i.toString().padStart(3, "0");
                this.load.image(`hero-${cfg.key}-${i}`, `${heroPath}${cfg.folder}/0_Forest_Ranger_${cfg.prefix}_${num}.png`);
            }
        });
    }

    _loadWeaponAnimations(weaponName, animConfigs) {
        this.load.image(`${weaponName}-inventory`, `weapons/${weaponName}/inventory/${weaponName}.png`);
        animConfigs.forEach(anim => {
        for (let i = 0; i <= anim.count; i++) {
            const num = i.toString().padStart(3, "0");
            this.load.image(`${weaponName}-${anim.key}-${i}`, `weapons/${weaponName}/${anim.folder}/${anim.prefix}_${num}.png`);
        }
    });
    }

    _loadAudio() {
        // Changement de dossier pour les sons
        this.load.setPath('./assets/sounds/');
        const sounds = [
            'step', 'punch', 'slime-move', 'hurt', 'death-player', 
            'death-mob', 'slime-hit', 'ground-explosion', 'metal-bite', 'slime-splash', 'bow_shot'
        ];
        sounds.forEach(s => this.load.audio(s, `${s}.mp3`));
        
        this.load.setPath(''); 
    }

    create() {
        this.scene.start('GameScene', this.startData);
    }
}