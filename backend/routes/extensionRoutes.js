const jwt = require('jsonwebtoken');
const { isUserSub } = require('../services/twitchApi');

module.exports = async function (fastify) {

  // 🔍 UI : savoir si on peut cliquer
  fastify.get('/extension/me', async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth) return reply.code(401).send();

    const token = auth.replace('Bearer ', '');
    let decoded;

    try {
      decoded = jwt.verify(
        token,
        Buffer.from(process.env.EXT_SECRET, 'base64'),
        { algorithms: ['HS256'] }
      );
    } catch {
      return reply.code(401).send();
    }

    const { role, user_id, channel_id } = decoded;

    if (role === 'broadcaster') {
      return { canInteract: true };
    }

    const isSub = await isUserSub(user_id, channel_id);
    return { canInteract: isSub };
  });

  // 🎮 Action gameplay
  fastify.post('/extension/action', async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth) return reply.code(401).send();

    const token = auth.replace('Bearer ', '');
    let decoded;

    try {
      decoded = jwt.verify(
        token,
        Buffer.from(process.env.EXT_SECRET, 'base64'),
        { algorithms: ['HS256'] }
      )

    } catch (err) {
      console.error('JWT ERROR:', err.message);
      return reply.code(401).send();
    }

    // ➜ envoyer vers le moteur de jeu (PubSub)
    fastify.pubsub.publish('game-action', {
      user: decoded.user_id,
      action: req.body.action
    });

    return { ok: true };
  });
};
