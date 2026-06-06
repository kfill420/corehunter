const { Server } = require("socket.io");
const EntityManager = require("../services/entityManager");

let io;
let entityManagerInstance;
const players = {};

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ["https://corehunter.vercel.app", "https://corehunter.vercel.app/", "http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const entityManager = new EntityManager(io);

  const rooms = {};

  io.on("connection", (socket) => {
    console.log(`[Network] Nouveau joueur connecté : ${socket.id}`);

    players[socket.id] = {
      playerId: socket.id,
      x: 450, 
      y: 450,
      anim: 'hero-idle',
      flipX: false,
      weapon: 'baseball'
    };

    // socket.on("joinRoom", (roomId) => {
    //     socket.join(roomId);
    //     entityManager.ensureRoom(roomId);
        
    //     socket.emit("slimeUpdate", entityManager.rooms[roomId].slimes);
        
    //     socket.emit("currentPlayers", entityManager.rooms[roomId].players);
    // });

    socket.on("createRoom", () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Code à 6 car.
        rooms[roomId] = {
            host: socket.id,
            players: [{ id: socket.id, name: `Player 1` }],
            gameStarted: false
        };
        socket.join(roomId);
        socket.emit("roomCreated", { roomId, players: rooms[roomId].players });
    });

    socket.on("joinRoom", (roomId) => {
        if (rooms[roomId]) {
            if (rooms[roomId].gameStarted) {
                return socket.emit("error", "Partie déjà en cours.");
            }

            if (!rooms[roomId].players.find(p => p.id === socket.id)) {
                socket.join(roomId);
                rooms[roomId].players.push({ id: socket.id, name: `Player ${rooms[roomId].players.length + 1}` });
            }
            
            // On prévient tout le monde dans la salle
            socket.emit("roomJoined", { roomId, players: rooms[roomId].players });
            io.to(roomId).emit("playerJoined", rooms[roomId].players);
        } else {
            socket.emit("error", "Code invalide.");
        }
    });

    socket.on("startGameRequest", (roomId) => {
        if (rooms[roomId] && rooms[roomId].host === socket.id) {
            rooms[roomId].gameStarted = true;
            io.to(roomId).emit("gameStarted");
        }
    });

    socket.on("requestSlimes", (data) => {
      const roomId = data.roomId || "default";
      entityManager.ensureRoom(roomId);
      socket.emit("slimeUpdate", entityManager.rooms[roomId].slimes);
      console.log(`[Server] Slimes envoyés pour la salle ${roomId} au joueur ${socket.id}`);
    });

    socket.on("restartGame", (roomId) => {
        console.log(`[Server] Réinitialisation de la salle : ${roomId}`);
        entityManager.resetRoom(roomId);
        io.to(roomId).emit("slimeUpdate", entityManager.rooms[roomId].slimes);
    });

    // 4. Gérer le mouvement reçu d'un client
    socket.on("playerMovement", (movementData) => {
      const roomId = movementData.roomId || "default";
    
      if (players[socket.id]) {
        players[socket.id].roomId = roomId;
        Object.assign(players[socket.id], movementData);
        entityManager.updatePlayerPos(socket, movementData); 
        socket.to(roomId).emit("playerMoved", {
          playerId: socket.id,
          ...movementData
        });
      }
    });

    // 5. Gérer les attaques
    socket.on("playerAttack", (attackData) => {
      const roomId = attackData.roomId || "default";
      socket.to(roomId).emit("remoteAttack", {
        playerId: socket.id,
        ...attackData
      });
    });

    socket.on("playerHitPlayer", (data) => {
      const { targetId, damage, roomId } = data;
      io.to(roomId).emit("playerTookDamage", {
        targetId,
        damage,
        attackerId: socket.id
      });
    })

    socket.on("leaveGameManual", () => {
        console.log(`[Server] Départ manuel du joueur : ${socket.id}`);
        entityManager.removePlayer(socket.id);
    });

    // 6. Déconnexion
    socket.on("disconnect", () => {
      console.log(`[Network] Joueur déconnecté : ${socket.id}`);

      for (let roomId in rooms) {
        const room = rooms[roomId];
        // On filtre la liste des joueurs de la room pour enlever celui qui part
        const initialCount = room.players.length;
        room.players = room.players.filter(p => p.id !== socket.id);

        if (room.players.length !== initialCount) {
          if (room.players.length === 0) {
            console.log(`[Room] Salle ${roomId} vide, suppression.`);
            delete rooms[roomId];
          } else {
            // Si c'était le host qui est parti, on peut donner le lead au suivant
            if (room.host === socket.id) {
              room.host = room.players[0].id;
            }
            io.to(roomId).emit("playerJoined", room.players);
            io.to(roomId).emit("userDisconnected", socket.id);
          }
        }
      }

      delete players[socket.id];
      entityManager.removePlayer(socket.id);
    });

    // 7. Demande la liste des joueurs
    socket.on("requestPlayers", (data) => {
      const roomId = data?.roomId || "default";
      const playersInRoom = {};
      for (let id in players) {
          if (players[id].roomId === roomId) {
              playersInRoom[id] = players[id];
          }
      }
      socket.emit("currentPlayers", playersInRoom);
      socket.to(roomId).emit("newPlayer", players[socket.id]);
    });

    socket.on("hitSlime", (data) => {
      entityManager.handleHitSlime(socket, data);
    });
  });
}

function publish(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, publish };