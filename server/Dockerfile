FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server/index.js ./server/index.js
COPY server/printer-catalog.json ./server/printer-catalog.json
COPY shared ./shared
RUN mkdir -p /data
EXPOSE 3001
CMD ["node", "server/index.js"]
