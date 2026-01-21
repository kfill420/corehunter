// backend/generateUserToken.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const redirectUri = "http://localhost";

if (!clientId || !clientSecret) {
  console.error("❌ TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant dans .env");
  process.exit(1);
}

const scopes = [
  "channel:read:redemptions",
  "channel:read:subscriptions",
  "channel:read:hype_train"
].join(" ");

const authUrl =
  `https://id.twitch.tv/oauth2/authorize` +
  `?client_id=${clientId}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(scopes)}`;

console.log("\n🔗 Ouvre cette URL dans ton navigateur pour autoriser l'application :\n");
console.log(authUrl + "\n");

// Ouvre automatiquement dans le navigateur Windows
exec(`start "" "${authUrl}"`);

console.log("👉 Après connexion, Twitch va te rediriger vers une URL comme :");
console.log("http://localhost/?code=XXXXXXXXX\n");
console.log("👉 Copie le code dans l'URL et colle-le ici.\n");

process.stdout.write("Code OAuth : ");

process.stdin.on("data", async (data) => {
  const code = data.toString().trim();

  console.log("\n⏳ Échange du code contre un token utilisateur...");

  const tokenUrl =
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${clientId}` +
    `&client_secret=${clientSecret}` +
    `&code=${code}` +
    `&grant_type=authorization_code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  try {
    const response = await fetch(tokenUrl, { method: "POST" });
    const json = await response.json();

    if (json.error) {
      console.error("❌ Erreur OAuth :", json);
      process.exit(1);
    }

    const tokenData = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in,
      obtainmentTimestamp: Date.now()
    };

    const tokensPath = path.join(__dirname, "tokens.json");
    fs.writeFileSync(tokensPath, JSON.stringify(tokenData, null, 2));

    console.log("\n✅ Token utilisateur généré avec succès !");
    console.log("📁 tokens.json mis à jour.\n");
    console.log("Tu peux maintenant lancer ton backend :");
    console.log("pnpm dev\n");

    process.exit(0);

  } catch (err) {
    console.error("❌ Erreur lors de la récupération du token :", err);
    process.exit(1);
  }
});
