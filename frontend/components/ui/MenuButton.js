/**
 * @class MenuButton
 * @extends Phaser.GameObjects.Container
 * @description Bouton personnalisé réutilisable avec animations et gestion d'état.
 */

export default class MenuButton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, label, isLocked, callback, size='m') {
        super(scene, x, y);

        this.label = label;
        this.isLocked = isLocked;
        this.callback = callback;
        
        // Configuration
        if (size === 'm') {
            this.btnWidth = 400;
            this.btnHeight = 60;
        } else if (size === 's') {
            this.btnWidth = 40;
            this.btnHeight = 40;
        }
        
        this.colorNormal = 0x1e1e82;
        this.colorHover = 0x3d3dbd;
        this.strokeNormal = isLocked ? 0x444444 : 0x00ffff;

        // 1. Fond (Graphics)
        this.bg = scene.add.graphics();
        this.drawBackground(this.isLocked ? 0x222222 : this.colorNormal, this.strokeNormal);

        this.text = scene.add.text(0, 0, this.label, {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            fill: this.isLocked ? '#666' : '#fff',
        }).setOrigin(0.5).setScale(0.5);

        this.add([this.bg, this.text]);
        scene.add.existing(this);

        if (!this.isLocked) {
            this.setupInteractions();
        } else {
            this.setAlpha(0.6);
        }
    }

    drawBackground(color, stroke) {
        this.bg.clear();
        this.bg.fillStyle(color, 0.8);
        this.bg.fillRoundedRect(-this.btnWidth / 2, -this.btnHeight / 2, this.btnWidth, this.btnHeight, 15);
        this.bg.lineStyle(2, stroke, 1);
        this.bg.strokeRoundedRect(-this.btnWidth / 2, -this.btnHeight / 2, this.btnWidth, this.btnHeight, 15);
    }

    setupInteractions() {
        // Définir la zone cliquable
        this.setInteractive(new Phaser.Geom.Rectangle(-this.btnWidth / 2, -this.btnHeight / 2, this.btnWidth, this.btnHeight), Phaser.Geom.Rectangle.Contains);
        
        this.on('pointerover', () => {
            this.drawBackground(this.colorHover, 0xffffff);
            this.text.setTint(0xffff00);
            this.scene.tweens.add({ targets: this, scale: 1.05, duration: 100 });
        });

        this.on('pointerout', () => {
            this.drawBackground(this.colorNormal, this.strokeNormal);
            this.text.clearTint();
            this.scene.tweens.add({ targets: this, scale: 1, duration: 100 });
        });

        this.on('pointerdown', () => {
            this.scene.tweens.add({ targets: this, scale: 0.95, duration: 50, yoyo: true });
            if (this.callback) this.callback();
        });
    }
}