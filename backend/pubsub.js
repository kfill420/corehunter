// backend/pubsub.js
const { initPubSub } = require('./services/pubsubService');
const { twitch } = require('./config');

/**
 * Initialise PubSub Twitch au démarrage du backend.
 * Appelé depuis server.js
 */
async function startPubSub() {
  try {
    await initPubSub(twitch.channelId);
    console.log('[PubSub] Initialisé avec succès');
  } catch (err) {
    console.error('[PubSub] Erreur lors de l\'initialisation :', err);
  }
}

module.exports = {
  startPubSub
};
