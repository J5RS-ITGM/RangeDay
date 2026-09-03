# Range Day — web/PWA image. Build the Expo web export inside Docker,
# serve it with nginx. The server needs no Node install; deploys are
# `git pull && docker compose up -d --build`.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# EXPO_BASE_URL stays unset: behind the proxy the app serves at the domain root
RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
