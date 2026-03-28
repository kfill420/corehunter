# 1. On part d'une image Node.js légère
FROM node:20-alpine

RUN npm install -g pnpm

# 2. On définit le dossier de travail dans le conteneur
WORKDIR /app

# 3. On copie d'abord les fichiers de dépendances pour optimiser le cache
COPY package*.json ./

# 4. On installe les dépendances
RUN pnpm install

# 5. On copie tout le reste du code (y compris server.js)
COPY . .

# 6. Ton app écoute sur le 3000 à l'intérieur du conteneur
EXPOSE 3000

# 7. La commande pour lancer ton serveur
CMD ["node", "server.js"]