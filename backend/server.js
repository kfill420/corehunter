const fastify = require('fastify')({ logger: true });
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const fastifyStatic = require('@fastify/static');
const http = require('http');
const cors = require('@fastify/cors');

const { initSocket } = require('./utils/socketManager');
const { port } = require('./config');
const routes = require('./routes');

const socketManager = require('./utils/socketManager');

fastify.decorate('pubsub', {
  publish: socketManager.publish
});


/* =========================
   PLUGINS (AVANT LES ROUTES)
========================= */

// ✅ CORS — OBLIGATOIRE pour Twitch Extensions
fastify.register(cors, {
  origin: true, // accepte *.ext-twitch.tv
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
});

// Servir le frontend (si besoin)
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend'),
  prefix: '/',
});

// Routes backend
fastify.register(routes);

/* =========================
   START SERVER
========================= */

async function start() {
  try {
    const server = http.createServer();

    await fastify.ready();

    fastify.listen({ server, port });

    initSocket(server);

    server.listen(port, () => {
      fastify.log.info(`Backend API: http://localhost:${port}`);
    });

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
