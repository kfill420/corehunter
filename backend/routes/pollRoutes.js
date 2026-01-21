const pollController = require('../controllers/pollController');

module.exports = async (fastify) => {
  fastify.post('/poll/create', pollController.createPoll);
};
