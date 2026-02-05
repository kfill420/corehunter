const fs = require("fs");
const path = require("path");

// Dossier où se trouvent les images (là où est ton script)
const folder = "./environment";

// Chemin final que tu veux dans le JSON
const baseUrl = "./assets/objects/environment";

const files = fs.readdirSync(folder);

const images = files
  .filter(f => f.toLowerCase().endsWith(".png"))
  .map(file => {
    const key = file.split("_")[0].toLowerCase();
    return {
      key,
      url: `${baseUrl}/${file}`
    };
  });

const output = { images };

fs.writeFileSync("assets_manifest.json", JSON.stringify(output, null, 2), "utf8");

console.log("JSON généré : assets_manifest.json");
