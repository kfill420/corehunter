const fs = require('fs');
const path = require('path');

class EntityManager {
    constructor(io) {
        this.io = io;
        this.rooms = {};
        this.loadMapData();
        this.init();
    }

    init() {
        setInterval(() => this.update(33), 33);
    }

    loadMapData() {
        const mapPath = path.join(__dirname, '../assets/map/map2.tmj');
        const map = JSON.parse(fs.readFileSync(mapPath));
        
        this.tileWidth = map.tilewidth;
        this.tileHeight = map.tileheight;
        this.mapWidth = map.width;
        this.tileCollisions = {};
        this.staticObjects = [];

        map.tilesets.forEach(ts => {
            let tilesetData = ts;
            if (ts.source) {
                const tsPath = path.join(__dirname, '../assets/map/', ts.source);
                try {
                    tilesetData = JSON.parse(fs.readFileSync(tsPath));
                } catch (e) { return; }
            }

            const firstGid = ts.firstgid;
            if (tilesetData.tiles) {
                tilesetData.tiles.forEach(tile => {
                    if (tile.objectgroup && tile.objectgroup.objects) {
                        this.tileCollisions[tile.id + firstGid] = tile.objectgroup.objects;
                    }
                });
            }
        });

        // On garde les calques de tuiles habituels
        this.obstacleLayers = map.layers.filter(l => l.name.startsWith("Obstacle") && l.data);

        // On récupère les objets
        map.layers.forEach(layer => {
            if (layer.type === "objectgroup" && (layer.name === "Bushes" || layer.name.startsWith("Obstacle"))) {
                layer.objects.forEach(obj => {
                    const hasTileCollision = obj.gid && this.tileCollisions[String(obj.gid)];
                    const isManualShape = !obj.gid && (obj.width > 0 && obj.height > 0);

                    if (hasTileCollision || isManualShape) {
                        this.staticObjects.push(obj);
                    }
                });
            }
        });
    }

    isColliding(x, y) {
        // TILE LAYERS (Murs, Grille)
        const tileX = Math.floor(x / this.tileWidth);
        const tileY = Math.floor(y / this.tileHeight);
        
        if (tileX < 0 || tileX >= this.mapWidth || tileY < 0) return true;

        const index = tileY * this.mapWidth + tileX;

        for (const layer of this.obstacleLayers) {
            if (!layer.data[index]) continue;
            const gid = layer.data[index];

            if (gid > 0) {
                const shapes = this.tileCollisions[String(gid)];
                if (shapes) {
                    const localX = x % this.tileWidth;
                    const localY = y % this.tileHeight;
                    const collision = shapes.some(obj => {
                        return localX >= obj.x && localX <= obj.x + obj.width &&
                               localY >= obj.y && localY <= obj.y + obj.height;
                    });
                    if (collision) return true;
                } else {
                    return true; 
                }
            }
        }

        // OBJECT LAYERS 
        for (const obj of this.staticObjects) {
            if (obj.gid) {
                const shapes = this.tileCollisions[String(obj.gid)];
                if (shapes) {
                    // Calcul de la position de base
                    const baseX = obj.x;
                    const baseY = obj.y - obj.height;
                
                    const collision = shapes.some(shape => {
                        return x >= baseX + shape.x && x <= baseX + shape.x + shape.width &&
                               y >= baseY + shape.y && y <= baseY + shape.y + shape.height;
                    });
                    if (collision) return true;
                }
            } else {
                if (x >= obj.x && x <= obj.x + obj.width &&
                    y >= obj.y && y <= obj.y + obj.height) {
                    return true;
                }
            }
        }

        return false;
    }

    ensureRoom(roomId) {
        if (!this.rooms[roomId]) {
            this.rooms[roomId] = {
                slimes: {},
                players: {},
                lastUpdate: Date.now()
            };
            this.spawnInitialSlimes(roomId);
        }
    }

    spawnInitialSlimes(roomId) {
        const stats = {
            1: { hp: 2, speed: 0.03, chaseSpeed: 0.05, range: 18 },
            2: { hp: 2, speed: 0.05, chaseSpeed: 0.06, range: 15 },
            3: { hp: 5, speed: 0.02, chaseSpeed: 0.03, range: 22 },
        };

        for (let i = 0; i < 3; i++) {
            const id = `slime_${roomId}_${i}`;
            const type = (i % 3) + 1;
            this.rooms[roomId].slimes[id] = {
                id: id,
                type: type,
                x: 300 + Math.random() * 400,
                y: 300 + Math.random() * 400,
                hp: stats[type].hp,
                stats: stats[type],
                state: "WANDER",
                detectionRange: 100,
                nextDecisionTime: 0,
                wanderVec: { x: 0, y: 0 },
                dead: false
            };
        }
    }

    resetRoom(roomId) {
        if (this.rooms[roomId]) {
            this.rooms[roomId].slimes = {};
            this.spawnInitialSlimes(roomId);
            console.log(`[EntityManager] Room ${roomId} réinitialisée.`);
            this.io.to(roomId).emit("slimeUpdate", this.rooms[roomId].slimes);
        }
    }

    update(delta) {
        const now = Date.now();

        Object.keys(this.rooms).forEach(roomId => {
            const room = this.rooms[roomId];
            const playersInRoom = Object.values(room.players).filter(p => p.isDead !== true);

            // Si la room ne contient plus de joueur on peut la supprimer
            if (playersInRoom.length === 0) return;

            Object.values(room.slimes).forEach(slime => {
                if (slime.dead || slime.isAttacking) return;

                // Trouver le joueur le plus proche
                let closestPlayer = null;
                let minDist = Infinity;
                
                playersInRoom.forEach(p => {
                    const dist = Math.hypot(p.x - slime.x, p.y - slime.y);
                    if (dist < minDist) {
                        minDist = dist;
                        closestPlayer = p;
                    }
                });

                // Logique d'état
                if (closestPlayer && minDist < slime.detectionRange) {
                    slime.state = "CHASE";
                } else {
                    slime.state = "WANDER";
                }

                const attackRange = slime.stats.range || 20;
                if (closestPlayer && minDist < attackRange && !slime.isAttacking) {
                    slime.isAttacking = true;
                    slime.state = "ATTACKING";

                    // On prévient tout le monde que CE slime attaque CE joueur
                    this.io.to(roomId).emit("slimeAction", { 
                        id: slime.id, 
                        action: "ATTACK", 
                        targetId: closestPlayer.playerId 
                    });
                
                    // On bloque le mouvement du slime pendant l'attaque 
                    setTimeout(() => {
                        slime.isAttacking = false;
                        slime.state = "CHASE";
                    }, 1000); 

                    return;
                }

                // Calcul du mouvement
                let moveVec = { x: 0, y: 0 };
                let currentSpeed = slime.stats.speed;

                if (slime.state === "CHASE" && closestPlayer) {
                    currentSpeed = slime.stats.chaseSpeed;
                    const dist = Math.hypot(closestPlayer.x - slime.x, closestPlayer.y - slime.y);

                    const stopDist = 10;
                    const resumeDist = 15;

                    if (dist > (slime.isMoving ? stopDist : resumeDist)) {
                        const angle = Math.atan2(closestPlayer.y - slime.y, closestPlayer.x - slime.x);
                        moveVec.x = Math.cos(angle);
                        moveVec.y = Math.sin(angle);
                    } else {
                        moveVec.x = 0;
                        moveVec.y = 0;
                    }

                } else {
                    // WANDER
                    if (now > slime.nextDecisionTime) {
                        if (Math.random() > 0.6) {
                            slime.wanderVec = { x: 0, y: 0 };
                        } else {
                            const angle = Math.random() * Math.PI * 2;
                            slime.wanderVec = { x: Math.cos(angle), y: Math.sin(angle) };
                        }
                        slime.nextDecisionTime = now + (2000 + Math.random() * 2000);
                    }
                    moveVec = slime.wanderVec;
                }

                // Application du mouvement
                if (moveVec.x !== 0 || moveVec.y !== 0) {
                    let finalVec = { x: moveVec.x, y: moveVec.y };

                    const isBlocked = this.isColliding(slime.x + finalVec.x * 20, slime.y + finalVec.y * 20)

                    if (isBlocked && slime.state === "CHASE") {
                        const angleToTest = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI / 1.5, -Math.PI / 1.5];
                        let foundPath = false;

                        for (let angleOffSet of angleToTest) {
                            const currentAngle = Math.atan2(moveVec.y, moveVec.x);
                            const testX = Math.cos(currentAngle + angleOffSet);
                            const testY = Math.sin(currentAngle + angleOffSet);

                            if (!this.isColliding(slime.x + testX * 30, slime.y + testY * 30)) {
                                finalVec.x = testX;
                                finalVec.y = testY;
                                foundPath = true;
                                break;
                            }
                        }
                        if (!foundPath) {
                            if (!this.isColliding(slime.x + moveVec.x * 25, slime.y)) {
                                finalVec.y = 0;
                            } else if (!this.isColliding(slime.x, slime.y + moveVec.y * 25)) {
                                finalVec.x = 0;
                            }
                        }
                    }

                    const nextX = slime.x + finalVec.x * currentSpeed * delta;
                    const nextY = slime.y + finalVec.y * currentSpeed * delta;

                    const radius = 8;

                    const checkX = nextX + (finalVec.x > 0 ? radius : -radius);
                    if (!this.isColliding(checkX, slime.y)) {
                        slime.x = nextX;
                    } else if (slime.state === "WANDER") {
                        // Si on tape un mur en errant, on change de direction au prochain cycle
                        slime.nextDecisionTime = 0; 
                    }
                
                    const checkY = nextY + (finalVec.y > 0 ? radius : -radius);
                    if (!this.isColliding(slime.x, checkY)) {
                        slime.y = nextY;
                    } else if (slime.state === "WANDER") {
                        slime.nextDecisionTime = 0;
                    }
                
                    slime.isMoving = true;
                } else {
                    slime.isMoving = false;
                }
            });

            // Envoi groupé des positions à la room spécifique
            this.io.to(roomId).emit("slimeUpdate", room.slimes);
        })
    }

    // Appelé par socketManager quand un joueur bouge
    updatePlayerPos(socket, data) {
        const roomId = data.roomId || "default"; 
        this.ensureRoom(roomId);
        this.rooms[roomId].players[socket.id] = { ...data, playerId: socket.id };
    }

    removePlayer(socketId) {
        Object.keys(this.rooms).forEach(roomId => {
            const room = this.rooms[roomId];
            if (room.players[socketId]) {
                delete room.players[socketId];
                
                // On vérifie le nombre de clés restantes dans l'objet
                const count = Object.keys(room.players).length;
                console.log(`[EntityManager] Joueurs restants dans ${roomId}: ${count}`);
            
                if (count === 0) {
                    console.log(`[EntityManager] Room ${roomId} vide -> Suppression.`);
                    delete this.rooms[roomId];
                }
            }
        });
    }

    handleHitSlime(socket, data) {
        const { id, damage, roomId } = data;
        const room = this.rooms[roomId];
        if (!room) return;

        const slime = room.slimes[id];

        if (slime && !slime.dead) {
            slime.hp -= damage;
            if (slime.hp <= 0) {
                slime.dead = true;

                this.io.to(roomId).emit("slimeStatUpdate", { id: slime.id, dead: true });

                setTimeout(() => {
                    if (room.slimes[id])
                        delete room.slimes[id];
                }, 3000);
            } else {
                this.io.to(roomId).emit("slimeStatUpdate", { id: slime.id, hp: slime.hp, dead: false });
            }
        }
    }
}

module.exports = EntityManager;