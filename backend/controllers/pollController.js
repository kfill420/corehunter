const pollService = require('../services/pollService');

exports.createPoll = async (req, reply) => {
  const result = await pollService.createWavePoll();
  reply.send(result);
};
