export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // IMPORTANT : Le menu a besoin de ses propres assets ou de ceux du jeu
        // On charge juste une frame pour les particules
        this.load.image('particle', './assets/character/forest_ranger/3/idle/0_Forest_Ranger_Idle_000.png');
    }

    create() {
        const { width, height } = this.scale;

        // --- 1. LE DÉGRADÉ (Méthode Canvas pour éviter les paliers) ---
        const texture = this.textures.createCanvas('menuGradient', width, height);
        const ctx = texture.getContext();
        const grd = ctx.createLinearGradient(0, 0, 0, height); // Vertical
        
        // On utilise des couleurs un peu plus espacées pour casser l'effet de paliers
        grd.addColorStop(0, '#050505'); 
        grd.addColorStop(1, '#1a1a55'); 
        
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
        texture.refresh();
        
        this.add.image(0, 0, 'menuGradient').setOrigin(0);

        // --- 2. LES PARTICULES (Avec la bonne clé d'image) ---
        this.add.particles(0, 0, 'particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            lifespan: 4000,
            speedY: { min: -20, max: -40 },
            scale: { start: 0.03, end: 0 },
            alpha: { start: 0.3, end: 0 },
            frequency: 150,
            blendMode: 'ADD'
        });

        // --- 3. TITRE ET BOUTONS ---
        this.add.text(width / 2, height * 0.2, 'MY STREAMER NEEDS HELP', {
            fontSize: '42px',
            fontFamily: 'Arial Black',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.createButton(width / 2, height * 0.5, 'MODE SOLO', false, () => {
            this.scene.start('GameScene', { mode: 'solo' });
        });

        this.createButton(width / 2, height * 0.65, 'MODE STREAMER (BIENTÔT)', true, () => {
            this.cameras.main.shake(200, 0.005);
        });
    }

    createButton(x, y, label, isLocked, callback) {
    const width = 400;
    const height = 60;
    const borderRadius = 20;

    // 1. Couleurs selon l'état
    const colorNormal = 0x1e1e82; // Bleu profond
    const colorHover = 0x3d3dbd;  // Bleu plus clair au survol
    const colorLocked = 0x222222; // Gris sombre
    const strokeColor = isLocked ? 0x444444 : 0x00ffff; // Bordure cyan ou grise

    // 2. Création du Container
    const container = this.add.container(x, y);

    // 3. Le fond arrondi (Graphics)
    const bg = this.add.graphics();
    const drawBg = (color) => {
        bg.clear();
        bg.fillStyle(color, 0.8);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
        bg.lineStyle(1, strokeColor, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, borderRadius);
    };
    drawBg(isLocked ? colorLocked : colorNormal);

    // 4. Le Texte
    const btnText = this.add.text(0, 0, label, {
        fontSize: '24px',
        fontFamily: 'Arial Black',
        fill: isLocked ? '#666' : '#fff',
    }).setOrigin(0.5);

    container.add([bg, btnText]);

    // 5. Interactivité
    if (!isLocked) {
        // Zone d'interaction (on définit un rectangle de la taille du bouton)
        container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
        container.cursor = 'pointer';

        container.on('pointerover', () => {
            drawBg(colorHover);
            this.tweens.add({ targets: container, scale: 1.05, duration: 100 });
            btnText.setStyle({ fill: '#ff0' }); // Jaune au survol
        });

        container.on('pointerout', () => {
            drawBg(colorNormal);
            this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
            btnText.setStyle({ fill: '#fff' });
        });

        container.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.95, duration: 50, yoyo: true });
            callback();
        });
    } else {
        container.setAlpha(0.6);
    }

    return container;
    }
}