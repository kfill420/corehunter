const { PubSubClient } = require('@twurple/pubsub');
const { authProvider } = require('../utils/authProvider');
const { broadcastToGame } = require('../utils/socketManager');

const pubSubClient = new PubSubClient({ authProvider });

exports.initPubSub = async (channelId) => {
  await pubSubClient.onRedemption(channelId, (msg) => {
    broadcastToGame('user-action', {
      user: msg.userDisplayName,
      action: msg.rewardTitle.toLowerCase()
    });
  });

  console.log('[PubSub] Ready');
};

exports.broadcastAction = async (data) => {
  broadcastToGame('user-action', data);
};
