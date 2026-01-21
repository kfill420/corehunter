let io;

function initSocket(server) {
  io = require('socket.io')(server, {
    cors: { origin: '*' }
  });

  io.on('connection', socket => {
    console.log('🧩 Client connecté');
  });
}

function publish(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

module.exports = { initSocket, publish };
