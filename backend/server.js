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

fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type']
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../frontend'),
  prefix: '/',
});

fastify.register(routes);


async function start() {
  try {
    await fastify.ready();

    socketManager.initSocket(fastify.server);

    await fastify.listen({ port: port, host: '127.0.0.1' });

    fastify.log.info(`Serveur lancé sur le port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
