# Range Day — web/PWA image. Build the Expo web export inside Docker,
# serve it with nginx. Supabase credentials arrive as build args (Expo
# inlines EXPO_PUBLIC_* at export time). The anon key is public by
# design — authority lives in RLS policies, not in secrecy of this key.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG EXPO_PUBLIC_SUPABASE_URL=""
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY=""
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
    EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
RUN npx expo export --platform web --output-dir dist

FROM nginx:alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
