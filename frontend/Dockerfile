# Build em duas etapas. O Node compila o site; o que vai para produção é só o
# resultado estático, servido por um Caddy minúsculo. A imagem final não leva
# node_modules nem código-fonte — fica em poucos megabytes.

FROM node:24-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# O Vite substitui import.meta.env.VITE_* em tempo de BUILD, não de execução.
# O endereço da API fica gravado dentro do JavaScript gerado: trocar de domínio
# exige reconstruir a imagem, reiniciar o contêiner não adianta.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
