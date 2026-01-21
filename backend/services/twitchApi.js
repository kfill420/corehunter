async function isUserSub(userId, channelId) {
  const res = await fetch(
    `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${channelId}&user_id=${userId}`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_APP_CLIENT_ID,
        'Authorization': `Bearer ${process.env.APP_ACCESS_TOKEN}`
      }
    }
  );

  return res.status === 200;
}

module.exports = { isUserSub };
