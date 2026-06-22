FROM node:20-alpine

# git is needed for simple-git operations
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY public/ ./public/
COPY config/ ./config/

# repos volume is mounted at runtime; create it so the path always exists
RUN mkdir -p /repos

VOLUME ["/repos", "/app/config"]

EXPOSE 3000

ENV NODE_ENV=production \
    REPOS_DIR=/repos \
    PORT=3000 \
    HOST=0.0.0.0

CMD ["node", "server/index.js"]
