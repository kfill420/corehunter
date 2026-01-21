const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;

fastify.get('/auth/callback', async (req, reply) => {
  const code = req.query.code;

  if (!code) {
    return reply.send("❌ Aucun code reçu.");
  }

  const tokenUrl =
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${clientId}` +
    `&client_secret=${clientSecret}` +
    `&code=${code}` +
    `&grant_type=authorization_code` +
    `&redirect_uri=http://localhost:3000/auth/callback`;

  const response = await fetch(tokenUrl, { method: "POST" });
  const json = await response.json();

  if (json.error) {
    return reply.send("❌ Erreur OAuth : " + JSON.stringify(json));
  }

  const tokenData = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    obtainmentTimestamp: Date.now()
  };

  fs.writeFileSync(path.join(__dirname, "tokens.json"), JSON.stringify(tokenData, null, 2));

  reply.send("✅ Token généré ! Tu peux fermer cette page.");
  console.log("🎉 Token utilisateur enregistré dans tokens.json");
});

fastify.listen({ port: 3000 }, () => {
  console.log("🌐 Serveur OAuth prêt sur http://localhost:3000");
});
