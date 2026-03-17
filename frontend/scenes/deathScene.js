export default class DeathScene extends Phaser.Scene {
    constructor() { super("DeathScene"); }

    init(data) {
        this.originScene = data.origin; // Pour savoir quelle scène redémarrer
    }

    create() {
        const { width, height } = this.scale;

        // 1. Fond semi-transparent
        this.add.rectangle(0, 0, width, height, 0x000000, 0.95).setOrigin(0);

        // 2. Texte "GAME OVER"
        this.add.text(width / 2, height / 2 - 80, 'VOUS ÊTES MORT', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // 3. Bouton REJOUER
        const btnRetry = this.createButton(width / 2, height / 2 + 20, 'REJOUER', () => {
            this.scene.stop(); // Ferme DeathScene
            this.scene.stop('UIScene');
            this.scene.stop(this.originScene); // Arrête GameScene
            this.scene.start(this.originScene); // Redémarre GameScene
        });

        // 4. Bouton MENU
        const btnMenu = this.createButton(width / 2, height / 2 + 100, 'MENU PRINCIPAL', () => {
            this.scene.stop();
            this.scene.stop('UIScene');
            this.scene.stop(this.originScene);
            this.scene.start('MenuScene'); // Adapte le nom à ton menu
        });
    }

    createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '24px',
            backgroundColor: '#333',
            padding: { x: 20, y: 10 },
            color: '#fff'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#555' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#333' }));
        btn.on('pointerdown', callback);

        return btn;
    }
}