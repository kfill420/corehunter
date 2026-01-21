const axios = require('axios');
require('dotenv').config();

async function getAppToken() {
  const res = await axios.post(
    `https://id.twitch.tv/oauth2/token`,
    null,
    {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }
    }
  );

  return res.data.access_token;
}

exports.createPoll = async (pollData) => {
  const token = await getAppToken();

  const res = await axios.post(
    'https://api.twitch.tv/helix/polls',
    pollData,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return res.data;
};
