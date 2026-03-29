class EntityManager {
    constructor(io) {
        this.io = io;
        this.rooms = {};
        this.init();
    }

    init() {
        // Boucle à 30 FPS
        setInterval(() => this.update(33), 33);
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
            const id = `slime_${roomId}_${i}`; // ID unique par room
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

    update(delta) {
        const now = Date.now();

        Object.keys(this.rooms).forEach(roomId => {
            const room = this.rooms[roomId];
            const playersInRoom = Object.values(room.players);

            // Si la room ne contient plus de joueur on peut la supprimer
            if (playersInRoom.length === 0) return;

            Object.values(room.slimes).forEach(slime => {
                if (slime.dead || slime.isAttacking) return;

                // 1. Trouver le joueur le plus proche
                let closestPlayer = null;
                let minDist = Infinity;
                
                playersInRoom.forEach(p => {
                    const dist = Math.hypot(p.x - slime.x, p.y - slime.y);
                    if (dist < minDist) {
                        minDist = dist;
                        closestPlayer = p;
                    }
                });

                // 2. Logique d'état
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

                // 3. Calcul du mouvement
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

                // 4. Application du mouvement (vitesse * delta)
                slime.x += moveVec.x * currentSpeed * delta;
                slime.y += moveVec.y * currentSpeed * delta;
                slime.isMoving = (moveVec.x !== 0 || moveVec.y !== 0);
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
            if (this.rooms[roomId].players[socketId]) {
                delete this.rooms[roomId].players[socketId];
                
                // Si la room est vide, on reset les slimes ou on supprime la room
                if (Object.keys(this.rooms[roomId].players).length === 0) {
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