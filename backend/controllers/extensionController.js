// controllers/extensionController.js
const jwt = require('jsonwebtoken');
const { isUserSub } = require('../services/twitchApi');

function verifyToken(req, reply) {
  const auth = req.headers.authorization;
  if (!auth) {
    reply.code(401).send();
    return null;
  }

  const token = auth.replace('Bearer ', '');

  try {
    return jwt.verify(
      token,
      Buffer.from(process.env.EXT_SECRET, 'base64'),
      { algorithms: ['HS256'] }
    );
  } catch (err) {
    console.error('JWT ERROR:', err.message);
    reply.code(401).send();
    return null;
  }
}

exports.getMe = async (req, reply) => {
  const decoded = verifyToken(req, reply);
  if (!decoded) return;

  const { role, user_id, channel_id } = decoded;

  if (role === 'broadcaster') {
    return { canInteract: true };
  }

  const isSub = await isUserSub(user_id, channel_id);
  return { canInteract: isSub };
};

exports.postAction = async (req, reply, fastify) => {
  const decoded = verifyToken(req, reply);
  if (!decoded) return;

  fastify.pubsub.publish('game-action', {
    user: decoded.user_id,
    action: req.body.action
  });

  return { ok: true };
};
