# Range Day — web/PWA image. Builds the Expo web export, serves via nginx.
# The API base is same-origin (/api) in production, so no build args needed.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
