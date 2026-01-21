const eventController = require('../controllers/eventController');

module.exports = async (fastify) => {
  fastify.get('/event/test', eventController.testEvent);
};
