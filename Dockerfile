FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci \
  && npx prisma generate \
  && npm prune --omit=dev \
  && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
COPY db ./db
COPY api ./api
COPY docs ./docs
COPY .env.example ./.env.example

EXPOSE 5000

CMD ["node", "src/server.js"]
