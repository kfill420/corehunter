export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.maxSlots = 3;
        this.selectedSlot = 0;
        this.inventory = ['baseball', '', '']; // Stocke les clés d'items

        // Valeurs pour le lissage (interpolation)
        this.targetData = { hp: 10, maxHp: 10, stamina: 10, maxStamina: 10 };
        this.visualHp = 10;
        this.visualStamina = 10;
    }

    create() {
        // Textes fixes
        this.add.text(10, 10, 'HP', { fontSize: '12px', fill: '#fff', fontStyle: 'bold' });
        this.add.text(10, 30, 'ST', { fontSize: '12px', fill: '#fff', fontStyle: 'bold' });

        this.hpBar = this.add.graphics();
        this.staminaBar = this.add.graphics();

        // Inventaire
        this.inventoryContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height - 40);
        this.drawInventory();

        // Events
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('updateUI', (data) => { 
                this.targetData = data; 
            }, 
            this);
        }
        

        // Changement de slot (Molette)
        this.input.on('wheel', (pointer, gameObjects, dx, dy) => {
            if (dy > 0) {
                this.selectedSlot = (this.selectedSlot + 1) % this.maxSlots;
            } else {
                this.selectedSlot = (this.selectedSlot - 1 + this.maxSlots) % this.maxSlots;
            }
            this.drawInventory();
            // On informe le joueur du changement d'arme
            gameScene.player.changeWeapon(this.inventory[this.selectedSlot]);
        });
    }

    drawInventory() {
        this.inventoryContainer.removeAll(true); // Le "true" détruit proprement les anciens objets
        const slotSize = 64;
        const spacing = 16;
        const totalWidth = (this.maxSlots * slotSize) + ((this.maxSlots - 1) * spacing);
        const startX = -totalWidth / 2;

        for (let i = 0; i < this.maxSlots; i++) {
            const x = startX + (i * (slotSize + spacing)) + (slotSize / 2);

            // 1. UTILISER make.rectangle au lieu de add.rectangle
            // Cela crée l'objet sans l'afficher immédiatement en haut à gauche
            const isSelected = (i === this.selectedSlot);
            const bg = this.make.graphics();

            // Dessin du fond et de la bordure
            bg.fillStyle(0x000000, 0.5);
            bg.fillRect(x - slotSize / 2, -slotSize / 2, slotSize, slotSize);

            bg.lineStyle(isSelected ? 3 : 2, isSelected ? 0xffff00 : 0xffffff, 0.8);
            bg.strokeRect(x - slotSize / 2, -slotSize / 2, slotSize, slotSize);

            this.inventoryContainer.add(bg);

            // Icône de l'item
            const itemKey = this.inventory[i];
            if (itemKey && itemKey !== '') {
                // Scale très petit (0.02 ou 0.03) car tes assets originaux sont énormes
                // On utilise make.image pour éviter la duplication en haut à gauche
                const icon = this.make.image({
                    x: x,
                    y: 0,
                    key: `${itemKey}-attacking-0`
                });

                icon.setScale(0.14); // Ajuste cette valeur selon tes assets
                icon.setOrigin(0.57, 0.4); // Centre parfaitement l'image

                this.inventoryContainer.add(icon);
            }
        }
    }

    update(time, delta) {
        // Interpolation linéaire (Lerp) pour l'effet fluide
        const lerpFactor = 0.1;
        this.visualHp = Phaser.Math.Linear(this.visualHp, this.targetData.hp, lerpFactor);
        this.visualStamina = Phaser.Math.Linear(this.visualStamina, this.targetData.stamina, lerpFactor);

        const startX = 40;

        // Dessin HP
        this.hpBar.clear();
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(startX, 12, (this.visualHp / this.targetData.maxHp) * 100, 8);

        // Dessin Stamina
        this.staminaBar.clear();
        this.staminaBar.fillStyle(0x00ff00, 1);
        this.staminaBar.fillRect(startX, 32, (this.visualStamina / this.targetData.maxStamina) * 100, 8);
    }

    upgradeInventory(amount) {
        this.maxSlots += amount;
        
        // On ajoute des slots vides au tableau pour correspondre à maxSlots
        while (this.inventory.length < this.maxSlots) {
            this.inventory.push(''); 
        }

        // On redessine tout (les slots s'aligneront automatiquement grâce à ta logique startX)
        this.drawInventory();
    }

    addItem(weaponKey) {
       // 1. Trouver le premier slot vide
       const emptySlot = this.inventory.indexOf('');
       
       if (emptySlot !== -1) {
           this.inventory[emptySlot] = weaponKey;
           this.drawInventory();
           
           // 2. Si l'objet est ramassé dans le slot actuellement sélectionné, 
           // on équipe le joueur immédiatement
           if (emptySlot === this.selectedSlot) {
               const gameScene = this.scene.get('GameScene');
               gameScene.player.changeWeapon(weaponKey);
           }
           return true; // Succès
       }
       return false; // Inventaire plein
    }
}