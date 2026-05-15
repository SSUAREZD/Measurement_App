# Stage 1: build Angular (browser + SSR server bundles)
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:prod

# Stage 2: runtime — Node sirviendo SSR
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4202

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

COPY certs ./certs

EXPOSE 4202
CMD ["node", "dist/measurement-app/server/server.mjs"]
