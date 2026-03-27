const fastify = require('fastify')({ logger: true });
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const fastifyStatic = require('@fastify/static');
const cors = require('@fastify/cors');

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
    await fastify.ready();

    // Fastify peut écouter sur le port directement
    // Pas besoin de créer http.createServer() manuellement ici si on utilise fastify.server
    await fastify.listen({ port: port, host: '0.0.0.0' });

    // On initialise le socket sur le serveur HTTP interne de Fastify
    socketManager.initSocket(fastify.server);

    fastify.log.info(`Serveur lancé sur le port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
