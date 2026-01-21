const jwt = require('jsonwebtoken');
const cooldownService = require('../services/cooldownService');
const pubsubService = require('../services/pubsubService');

exports.handleAction = async (req, reply) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.EXT_SECRET);
  } catch (err) {
    return reply.status(401).send({ error: 'Invalid Twitch token' });
  }

  const userId = decoded.user_id;      // 👈 VRAI user Twitch
  const channelId = decoded.channel_id;
  const role = decoded.role;

  const { action } = req.body;

  if (!action) {
    return reply.status(400).send({ error: 'Missing action' });
  }

  // Cooldown par utilisateur
  if (cooldownService.isOnCooldown(userId, 5000)) {
    return reply.status(429).send({ error: 'Cooldown en cours' });
  }

  cooldownService.updateCooldown(userId);

  await pubsubService.broadcastAction({
    userId,
    channelId,
    role,
    action,
    timestamp: Date.now()
  });

  reply.send({ success: true });
};
