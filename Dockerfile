FROM node:20-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=build-client /app/client/dist ../client/dist

VOLUME ["/app/configs"]
EXPOSE 3000
CMD ["node", "index.js"]
