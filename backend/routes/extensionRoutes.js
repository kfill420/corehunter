// routes/extensionRoutes.js
const {
  getMe,
  postAction
} = require('../controllers/extensionController');

module.exports = async function (fastify) {

  fastify.get('/extension/me', async (req, reply) => {
    return getMe(req, reply);
  });

  fastify.post('/extension/action', async (req, reply) => {
    return postAction(req, reply, fastify);
  });

};
