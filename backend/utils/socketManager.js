const { Server } = require("socket.io");

let io;
const players = {}; // Objet pour stocker les joueurs : { socketId: { x, y, anim, flipX } }

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // À restreindre en production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Network] Nouveau joueur connecté : ${socket.id}`);

    // 1. Créer un nouveau joueur dans notre base locale
    players[socket.id] = {
      playerId: socket.id,
      x: 450, // Position par défaut
      y: 450,
      anim: 'hero-idle',
      flipX: false,
      weapon: 'baseball'
    };

    // 2. Envoyer la liste de TOUS les joueurs actuels au nouveau venu
    socket.emit("currentPlayers", players);

    // 3. Informer tous les AUTRES qu'un nouveau joueur est arrivé
    socket.broadcast.emit("newPlayer", players[socket.id]);

    // 4. Gérer le mouvement reçu d'un client
    socket.on("playerMovement", (movementData) => {
      if (players[socket.id]) {
        // Mettre à jour les données sur le serveur
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].anim = movementData.anim;
        players[socket.id].flipX = movementData.flipX;
        players[socket.id].weapon = movementData.weapon;

        // Diffuser la mise à jour à tout le monde sauf à l'envoyeur
        socket.broadcast.emit("playerMoved", players[socket.id]);
      }
    });

    // 5. Gérer les attaques
    socket.on("playerAttack", (attackData) => {
        // On renvoie l'info aux autres pour qu'ils voient l'animation
        socket.broadcast.emit("remoteAttack", {
            playerId: socket.id,
            ...attackData
        });
    });

    // 6. Déconnexion
    socket.on("disconnect", () => {
      console.log(`[Network] Joueur déconnecté : ${socket.id}`);
      delete players[socket.id];
      // Informer les autres pour qu'ils suppriment le sprite
      io.emit("userDisconnected", socket.id);
    });

    // 7. Demande la liste des joueurs
    socket.on("requestPlayers", () => {
        // On renvoie la liste complète à celui qui demande
        socket.emit("currentPlayers", players);
    });
  });
}

// Pour publier des messages depuis tes routes Fastify si besoin
function publish(event, data) {
  if (io) io.emit(event, data);
}

module.exports = { initSocket, publish };