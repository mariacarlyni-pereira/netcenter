FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copia package files first para cache de camadas do Docker
COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm install --omit=dev
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
