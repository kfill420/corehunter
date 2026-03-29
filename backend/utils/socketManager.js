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

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        entityManager.ensureRoom(roomId);
        
        socket.emit("slimeUpdate", entityManager.rooms[roomId].slimes);
        
        socket.emit("currentPlayers", entityManager.rooms[roomId].players);
    });

    socket.on("restartGame", (roomId) => {
        console.log(`[Server] Réinitialisation de la salle : ${roomId}`);
        entityManager.resetRoom(roomId);
        io.to(roomId).emit("slimeUpdate", entityManager.rooms[roomId].slimes);
    });

    // 2. Envoyer la liste de TOUS les joueurs actuels au nouveau venu
    socket.emit("currentPlayers", players);

    // 3. Informer tous les AUTRES qu'un nouveau joueur est arrivé
    socket.broadcast.emit("newPlayer", players[socket.id]);

    // 4. Gérer le mouvement reçu d'un client
    socket.on("playerMovement", (movementData) => {
      const roomId = movementData.roomId || "default";
    
      if (players[socket.id]) {
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

    socket.on("leaveGameManual", () => {
        console.log(`[Server] Départ manuel du joueur : ${socket.id}`);
        entityManager.removePlayer(socket.id);
    });

    // 6. Déconnexion
    socket.on("disconnect", () => {
      console.log(`[Network] Joueur déconnecté : ${socket.id}`);
      delete players[socket.id];
      entityManager.removePlayer(socket.id);
      io.emit("userDisconnected", socket.id);
    });

    // 7. Demande la liste des joueurs
    socket.on("requestPlayers", () => {
        socket.emit("currentPlayers", players);
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