// backend/config.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,

  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    channelId: process.env.TWITCH_CHANNEL_ID,
    appToken: process.env.TWITCH_APP_TOKEN
  }
};
