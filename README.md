# Core Hunter – Jeu d'Action Top-Down

Core Hunter est un jeu d'action interactif développé avec Phaser 3 et Matter.js. Le joueur incarne un héros affrontant des vagues de slimes intelligents dans un environnement dynamique. Le projet met l'accent sur la fluidité des mouvements (dash, sprint), la précision des collisions physiques et une immersion sonore spatialisée.

## Objectifs du projet

- Gameplay Nerveux : Proposer des mécaniques de déplacement avancées (Sprint, Slide).

- IA Évolutive : Gérer des comportements d'ennemis distincts (Errance, Chasse, Attaque) selon le type de Slime.

- Immersion Sonore : Intégrer une spatialisation audio en temps réel (Panoramique et Volume) basée sur la distance.

- Personnalisation : Offrir un système de remappage complet des touches et de gestion du volume via le localStorage.

- Physique Réaliste : Utiliser le moteur Matter.js pour des collisions précises et des interactions fluides.

## Stack Technique

### Framework & Moteur de jeu
- Phaser 3.90+ – Moteur de jeu HTML5 principal.

- Matter.js – Moteur physique intégré pour la gestion des corps circulaires et des capteurs (sensors).

### Communication & Temps réel
- Socket.io Client – Préparé pour l'intégration de fonctionnalités multijoueurs.

### Architecture & Outils
- JavaScript (ES6+) – Programmation orientée objet pour la gestion des entités (Player, Slime).

- LocalStorage API – Persistance des réglages utilisateur (Volume, Keybindings).

- Serve – Serveur de développement léger pour le rendu local.

## Fonctionnalités Clés

1. Système de Combat & IA

- Slimes Multi-types : Trois variantes d'ennemis avec des statistiques de vitesse, de dégâts et de portée d'attaque propres.

- Animations Directionnelles : Gestion complexe des spritesheets pour le mouvement et l'attaque sur 4 directions.

- Feedback Visuel : Système de "Flash" (Tint) lors des dégâts et animations de mort synchronisées.

2. Contrôles Avancés

- Mouvements : ZQSD (par défaut) avec gestion du Sprint (Shift) et du Slide (Ctrl).

- Remapping : Interface dédiée dans SettingsScene pour redéfinir chaque action du clavier.

3. Audio Spatialisé

- Calcul dynamique du Pan (Stéréo gauche/droite) et du Gain (Volume) selon la position de la caméra.

- Variation du Pitch/Rate aléatoire sur les impacts pour éviter la redondance sonore.

## Scripts Disponibles

Dans le répertoire du projet, vous pouvez exécuter :

- ```pnpm dev``` : Lance le serveur de développement local via serve.

- ```pnpm build``` : (Non nécessaire pour cette version Vanilla JS).

## Structure du Projet

```
src/
├── assets/             # Spritesheets, sons et musiques
├── src/                # Code source du jeu
│   ├── scenes/         # Classes Phaser (Menu, Game, Settings, Death)
│   ├── components/     # Classes logiques (Player.js, Slime.js)
│   └── game.js         # Configuration du jeu et lancement
├── index.html          # Point d'entrée de l'application
└── package.json        # Dépendances et scripts
```
