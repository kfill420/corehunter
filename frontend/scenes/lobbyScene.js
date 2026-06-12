import { networkManager } from "../services/NetworkManager.js";
import MenuButton from "../components/ui/MenuButton.js";

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super("LobbyScene");
        this.inputText = "";
    }

    create() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // Reprise du fond et des particules de MenuScene
        this._setupBackground(width, height);
        this._setupParticles(width, height);

        // Conteneur principal pour le contenu
        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillRoundedRect(
            centerX - (width * 0.8) / 2,
            height / 2 - (height * 0.8) / 2,
            width * 0.8,
            height * 0.8,
            20
        );

        // Titre
        this.add.text(centerX, 60, "SALLON MULTIJOUEUR", { 
            fontSize: '42px', 
            fontFamily: 'Arial Black',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        // Utilisation du composant MenuButton pour les actions
        this.btnCreate = new MenuButton(this, centerX, 150, "CRÉER UNE PARTIE", false, () => {
            networkManager.createRoom();
        });

        this.separatorText = this.add.text(centerX, 210, "— OU —", { fontSize: '20px', fill: '#888' }).setOrigin(0.5);

        this.rejoindreLabel = this.add.text(centerX, 250, "REJOINDRE (Taper le code) :", { fontSize: '18px', fill: '#ddd' }).setOrigin(0.5);
        
        this.codeDisplay = this.add.text(centerX, 290, "_ _ _ _ _ _", { 
            fontSize: '32px', 
            fontFamily: 'monospace',
            backgroundColor: '#222',
            padding: { x: 20, y: 5 },
            fixedWidth: 250, align: 'center'
        }).setOrigin(0.5);

        this.btnJoin = new MenuButton(this, centerX, 360, "REJOINDRE", false, () => {
            if (this.inputText.length === 6) networkManager.joinRoom(this.inputText);
        });
        this.btnJoin.setScale(0.8);

        // Zone dynamique pour la liste des joueurs
        this.roomTitleText = this.add.text(centerX, 420, "", { 
           fontSize: '22px', 
           fill: '#00ffff', 
           fontStyle: 'bold',
           backgroundColor: '#00000033',
           padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
        
        this.playerListText = this.add.text(centerX, 450, "", { 
            fontSize: '18px', 
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5, 0);

        // Bouton Lancer
        this.btnStart = new MenuButton(this, centerX, 550, "LANCER LA PARTIE !", false, () => {
            networkManager.startGame(networkManager.currentRoom, this.slimeCount);
        });
        this.btnStart.setVisible(false);

        // Gestion des mobs
        this.slimeCount = 3;

        this.slimeCountTitle = this.add.text(centerX, 630, "Nombre de slimes:", {
            fontSize: '16px', fill: '#ddd'
        }).setOrigin(0.5);
        this.slimeCountTitle.setVisible(false);

        this.slimeCountLabel = this.slimeCountText = this.add.text(centerX, 680, `${this.slimeCount}`, { 
            fontSize: '24px', fill: '#00ffff', fontStyle: 'bold' 
        }).setOrigin(0.5);
        this.slimeCountLabel.setVisible(false);
        
        this.slimeCountBtnMin = new MenuButton(this, centerX - 60, 680, "-", false, () => {
            this.slimeCount = Math.max(1, this.slimeCount - 1);
            this.slimeCountText.setText(`${this.slimeCount}`);
        }, 's');
        this.slimeCountBtnMin.setVisible(false);
        
        this.slimeCountBtnPlus = new MenuButton(this, centerX + 60, 680, "+", false, () => {
            this.slimeCount = Math.min(20, this.slimeCount + 1);
            this.slimeCountText.setText(`${this.slimeCount}`);
        }, 's');
        this.slimeCountBtnPlus.setVisible(false);

        // Gestion Clavier
        this.input.keyboard.on('keydown', (event) => {
            if (event.keyCode === 8 && this.inputText.length > 0) {
                this.inputText = this.inputText.slice(0, -1);
            } else if (event.ctrlKey || event.metaKey) return; 
            else if (this.inputText.length < 6) {
                const char = event.key.toUpperCase();
                if (/^[A-Z0-9]$/.test(char)) this.inputText += char;
            }
            this._updateCodeDisplay();
        });

        const handlePaste = (event) => {
            // On ne traite le coller que si cette scène est active
            if (!this.scene.isActive("LobbyScene")) return;

            const pasteData = (event.clipboardData || window.clipboardData).getData('text');
            // On nettoie la chaîne
            const cleanData = pasteData.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

            if (cleanData) {
                this.inputText = cleanData;
                this._updateCodeDisplay();
            }
        };

        window.addEventListener('paste', handlePaste);

        // Nettoyage de l'événement quand on quitte la scène
        this.events.once('shutdown', () => {
            window.removeEventListener('paste', handlePaste);
            networkManager.cleanupLobbyEvents();

            if (this.playerNameTexts) {
                this.playerNameTexts.forEach(t => t.destroy());
                this.playerNameTexts = [];
            }
        
            if (this.particles) {
                this.particles.destroy();
                this.particles = null;
            }
        });

        // Gestion du clic pour copier
        this.roomTitleText.on('pointerdown', () => {
            const code = networkManager.currentRoom;
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    this._showCopyFeedback();
                });
            }
        });

        this.roomTitleText.on('pointerover', () => this.roomTitleText.setTint(0xffff00));
        this.roomTitleText.on('pointerout', () => this.roomTitleText.clearTint());

        this.copyTip = this.add.text(centerX, 400, "(Cliquer sur le code pour copier)", { fontSize: '12px', fill: '#888' })
            .setOrigin(0.5)
            .setVisible(false);

        networkManager.setupLobbyEvents(this);
    }

    updateUI() {
    if (!networkManager.currentRoom) return;
    if (!this.sys || !this.sys.isActive()) return;

    this.roomTitleText.setText(`CODE : ${networkManager.currentRoom}`);

    // Détruire les anciens textes via un simple tableau JS — plus de Group
    if (this.playerNameTexts) {
        this.playerNameTexts.forEach(t => t.destroy());
    }
    this.playerNameTexts = [];

    const columns = 3;
    const colWidth = 180;
    const rowHeight = 40;
    const startX = this.scale.width / 2 - colWidth;
    const startY = 450;

    networkManager.roomPlayers.forEach((player, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const x = startX + (col * colWidth);
        const y = startY + (row * rowHeight);

        const nameText = this.add.text(x, y, `• ${player.name}`, {
            fontSize: '18px',
            fill: (index === 0) ? '#00ff00' : '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.playerNameTexts.push(nameText); // ← tableau JS, pas un Group Phaser
    });

    const rowCount = Math.ceil(networkManager.roomPlayers.length / columns);
    const gridBottom = startY + (rowCount * rowHeight);

    this.btnStart.setPosition(this.scale.width / 2, gridBottom + 40);

    const isHost = networkManager.roomPlayers[0]?.id === networkManager.socket.id;
    this.btnStart.setVisible(isHost);
    this.slimeCountTitle.setVisible(isHost);
    this.slimeCountLabel.setVisible(isHost);
    this.slimeCountBtnMin.setVisible(isHost);
    this.slimeCountBtnPlus.setVisible(isHost);
}

    _updateCodeDisplay() {
        this.codeDisplay.setText(this.inputText.padEnd(6, '_').split('').join(' '));
    }

    _showCopyFeedback() {
        const originalText = `CODE : ${networkManager.currentRoom}`;
        this.roomTitleText.setText("CODE COPIÉ !").setFill("#00ff00");
        
        this.time.delayedCall(1500, () => {
            if (this.roomTitleText && this.roomTitleText.active) {
                this.roomTitleText.setText(originalText).setFill("#00ffff");
            }
        });
    }

    // Méthodes reprises de MenuScene pour la cohérence visuelle
    _setupBackground(width, height) {
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

    launchGame() {
        this.scene.start("PreloadScene", { mode: 'multi', roomId: networkManager.currentRoom });
    }
}