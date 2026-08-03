# Imagem da API. O que a torna diferente de um Dockerfile Node comum é o
# Chromium: o Puppeteer precisa de um navegador de verdade para renderizar a
# carteirinha, e ele não vem em nenhuma imagem base.
FROM node:24-slim

# Chromium do Debian em vez do que o Puppeteer baixa sozinho. O apt resolve
# todas as bibliotecas de sistema junto (são mais de vinte), o que evita a
# caçada por "error while loading shared libraries" que acontece quando se
# tenta listar as dependências à mão. De quebra economiza ~150 MB na imagem.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
       chromium \
       fonts-liberation \
       ca-certificates \
       dumb-init \
  && rm -rf /var/lib/apt/lists/*

# Diz ao Puppeteer para usar o Chromium do sistema e não baixar o próprio.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Instala as dependências antes de copiar o código: assim o cache do Docker só
# é invalidado quando o package.json muda, e não a cada alteração de código.
COPY package*.json ./
RUN npm ci --omit=dev

# O client do Prisma é gerado a partir do schema, então precisa do schema antes.
COPY src/prisma ./src/prisma
RUN npx prisma generate

COPY . .

# /app/dados é onde o volume persistente monta (ver render.yaml). Criar aqui
# garante que o diretório exista com o dono certo antes do primeiro upload.
RUN mkdir -p /app/dados/uploads/fotos \
             /app/dados/uploads/carteirinhas \
             /app/dados/privado/comprovantes \
  && chown -R node:node /app

# Rodar como root é desnecessário e amplia o estrago de qualquer falha — mais
# ainda com um navegador embutido, que é superfície de ataque conhecida.
USER node

EXPOSE 3333

# dumb-init como PID 1: sem ele, processos do Chromium que morrem viram zumbis
# e o contêiner acumula lixo até travar.
ENTRYPOINT ["dumb-init", "--"]

# Aplica as migrações pendentes antes de subir. Se falhar, o contêiner não sobe
# — que é o comportamento certo: melhor não subir do que subir com o banco
# desalinhado do código.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
