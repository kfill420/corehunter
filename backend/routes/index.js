// backend/routes/index.js

module.exports = async (fastify) => {
  // fastify.register(require('./actionRoutes'));
  fastify.register(require('./eventRoutes'));
  fastify.register(require('./extensionRoutes'));
};
