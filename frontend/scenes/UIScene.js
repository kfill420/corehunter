/**
 * @class UIScene
 * @description Gère l'affichage tête haute (HUD) : Barres de vie, stamina et inventaire.
 */

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        
        // Data
        this.maxSlots = 3;
        this.selectedSlot = 0;
        this.inventory = ['baseball', 'bow', ''];

        // Lissage
        this.targetData = { hp: 10, maxHp: 10, stamina: 10, maxStamina: 10 };
        this.visualHp = 10;
        this.visualStamina = 10;
        
        // Références d'objets
        this.slots = [];
        this.icons = [];
    }

    create() {
        const { width, height } = this.scale;

        // 1. BARRES DE STATUTS
        this._setupStatusBars();

        // 2. INVENTAIRE
        this.inventoryContainer = this.add.container(width / 2, height - 50);
        this.selectionVisual = this.add.graphics();
        this.inventoryContainer.add(this.selectionVisual);
        
        this.drawInventory();

        // 3. ÉVÉNEMENTS
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('updateUI', (data) => { 
                this.targetData = data; 
            }, this);
        }

        // 4. INPUTS
        this._setupInputs(gameScene);
    }

    _setupStatusBars() {
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(40, 10, 205, 12, 4);
        bg.fillRoundedRect(40, 30, 205, 12, 4);

        this.add.text(10, 10, 'HP', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' });
        this.add.text(10, 30, 'ST', { fontSize: '20px', fill: '#fff', fontStyle: 'bold' });

        this.hpBar = this.add.graphics();
        this.staminaBar = this.add.graphics();
    }

    _setupInputs(gameScene) {
        // Molette
        this.input.on('wheel', (pointer, gameObjects, dx, dy) => {
            const direction = dy > 0 ? 1 : -1;
            this.changeSelectedSlot(this.selectedSlot + direction, gameScene);
        });

        // Touches 1, 2, 3
        this.input.keyboard.on('keydown-ONE', () => this.changeSelectedSlot(0, gameScene));
        this.input.keyboard.on('keydown-TWO', () => this.changeSelectedSlot(1, gameScene));
        this.input.keyboard.on('keydown-THREE', () => this.changeSelectedSlot(2, gameScene));
    }

    changeSelectedSlot(newIndex, gameScene) {
        this.selectedSlot = (newIndex + this.maxSlots) % this.maxSlots;
        
        this._updateSelectionHighlight();
        
        if (gameScene?.player) {
            gameScene.player.changeWeapon(this.inventory[this.selectedSlot]);
        }
    }

    drawInventory() {
        this.inventoryContainer.iterate(child => {
            if (child !== this.selectionVisual) child.destroy();
        });
        this.slots = [];
        this.icons = [];

        const slotSize = 64;
        const spacing = 12;
        const startX = -((this.maxSlots * (slotSize + spacing)) - spacing) / 2;

        for (let i = 0; i < this.maxSlots; i++) {
            const x = startX + (i * (slotSize + spacing)) + slotSize / 2;

            // Slot Background
            const bg = this.add.graphics();
            bg.fillStyle(0x222222, 0.8);
            bg.fillRoundedRect(x - slotSize / 2, -slotSize / 2, slotSize, slotSize, 8);
            bg.lineStyle(2, 0xffffff, 0.3);
            bg.strokeRoundedRect(x - slotSize / 2, -slotSize / 2, slotSize, slotSize, 8);
            
            this.inventoryContainer.add(bg);

            // Item Icon
            const itemKey = this.inventory[i];
            if (itemKey && itemKey !== '') {
                const icon = this.make.image({
                    x: x, 
                    y: 0,
                    key: `${itemKey}-inventory`
                });

                icon.setScale(0.48); 
                // icon.setOrigin(0.57, 0.42); 
                this.inventoryContainer.add(icon);
            }
        }
        this._updateSelectionHighlight();
    }

    _updateSelectionHighlight() {
        const slotSize = 64;
        const spacing = 12;
        const startX = -((this.maxSlots * (slotSize + spacing)) - spacing) / 2;
        const x = startX + (this.selectedSlot * (slotSize + spacing)) + slotSize / 2;

        this.selectionVisual.clear();
        this.selectionVisual.lineStyle(4, 0x00ffff, 1);
        this.selectionVisual.strokeRoundedRect(x - slotSize / 2, -slotSize / 2, slotSize, slotSize, 8);
        
        // Effet pulse sur la sélection
        this.tweens.add({
            targets: this.selectionVisual,
            alpha: { start: 1, to: 0.6 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    update(time, delta) {
        // Lerp factor ajusté par delta pour être indépendant des FPS
        const lerpFactor = 0.01 * delta; 
        this.visualHp = Phaser.Math.Linear(this.visualHp, this.targetData.hp, lerpFactor);
        this.visualStamina = Phaser.Math.Linear(this.visualStamina, this.targetData.stamina, lerpFactor);

        this._renderBars();
    }

    _renderBars() {
        const startX = 42;
        const barWidth = 200;

        // Draw HP
        this.hpBar.clear();
        this.hpBar.fillStyle(0xff4444, 1);
        this.hpBar.fillRoundedRect(startX, 12, (this.visualHp / this.targetData.maxHp) * barWidth, 8, 2);

        // Draw Stamina
        this.staminaBar.clear();
        this.staminaBar.fillStyle(0x44ff44, 1);
        this.staminaBar.fillRoundedRect(startX, 32, (this.visualStamina / this.targetData.maxStamina) * barWidth, 8, 2);
    }
}