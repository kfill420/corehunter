/**
 * @class MenuScene
 * @description Écran d'accueil du jeu. Gère la navigation principale, 
 */

import MenuButton from "../components/ui/MenuButton.js";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // Particules
        this.load.image('particle', './assets/character/forest_ranger/3/idle/0_Forest_Ranger_Idle_000.png');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Initialisation de l'environnement
        this._applyGlobalVolume();
        this._setupBackground(width, height);
        this._setupParticles(width, height);

        // 2. Vérification de la plateforme
        if (!this.sys.game.device.os.desktop) {
            return this._showMobileWarning(width, height);
        }

        // 3. Construction de l'interface
        this._createUI(width, height);

        // 4. Gestion du redimensionnement (Crucial pour le web)
        this.scale.on('resize', this._onResize, this);
    }


    _setupBackground(width, height) {
        // Création d'une texture dégradée
        if (!this.textures.exists('menuGradient')) {
            const canvas = this.textures.createCanvas('menuGradient', width, height);
            const ctx = canvas.getContext();
            const grd = ctx.createLinearGradient(0, 0, 0, height);
            grd.addColorStop(0, '#050505');
            grd.addColorStop(1, '#1a1a55');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);
            canvas.refresh();
        }
        this.bgImage = this.add.image(0, 0, 'menuGradient').setOrigin(0);
    }

    _setupParticles(width, height) {
        this.particles = this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 4000,
            speedY: { min: -20, max: -40 },
            scale: { start: 0.03, end: 0 },
            alpha: { start: 0.3, end: 0 },
            frequency: 150,
            blendMode: 'ADD'
        });
    }

    _createUI(width, height) {
        // Titre
        this.titleText = this.add.text(width / 2, height * 0.2, 'CORE HUNTER', {
            fontSize: '42px',
            fontFamily: 'Arial Black',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.btnSolo = new MenuButton(this, width / 2, height * 0.5, 'SOLOPLAYER', false, () => {
            this.scene.start('PreloadScene', { mode: 'solo' });
        });

        this.btnMulti = new MenuButton(this, width / 2, height * 0.62, 'MULTIPLAYER', false, () => {
            // this.cameras.main.shake(200, 0.005);
            this.scene.start('PreloadScene', { mode: 'multi' });
        });

        this.btnSettings = new MenuButton(this, width / 2, height * 0.74, 'RÉGLAGES', false, () => {
            this.scene.launch('SettingsScene', { origin: this.scene.key });
        });
    }

    /**
     * @method createButton
     * @description Génère un bouton interactif stylisé avec feedback visuel.
     */

    _onResize(gameSize) {
        const { width, height } = gameSize;
        
        // Repositionnement dynamique
        this.bgImage.setDisplaySize(width, height);
        this.titleText.setPosition(width / 2, height * 0.2);
        this.btnSolo.setPosition(width / 2, height * 0.5);
        this.btnMulti.setPosition(width / 2, height * 0.62);
        this.btnSettings.setPosition(width / 2, height * 0.74);
        
        // Mise à jour de la zone d'émission des particules
        if (this.particles) {
            this.particles.setPosition(0, 0);
        }
    }

    _applyGlobalVolume() {
        const savedVolume = localStorage.getItem('game_volume');
        if (savedVolume !== null) {
            this.sound.volume = parseFloat(savedVolume);
        }
    }

    _showMobileWarning(width, height) {
        const overlay = this.add.graphics().fillStyle(0x050505, 0.9).fillRect(0, 0, width, height);
        this.add.text(width / 2, height / 2, "PC ONLY\nKEYBOARD & MOUSE REQUIRED", {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            fill: '#ff0000',
            align: 'center'
        }).setOrigin(0.5);
    }
}