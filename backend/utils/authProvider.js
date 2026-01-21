const { RefreshingAuthProvider } = require('@twurple/auth');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const tokensPath = path.join(__dirname, '..', 'tokens.json');

const tokenData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

const authProvider = new RefreshingAuthProvider(
  {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET
  },
  tokenData
);

authProvider.onRefresh((userId, newTokenData) => {
  fs.writeFileSync(tokensPath, JSON.stringify(newTokenData, null, 2));
});

module.exports = { authProvider };
