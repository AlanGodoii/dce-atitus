# Carteirinha Estudantil Digital — DCE ATITUS

Sistema de emissão e gestão da Carteira de Identificação Estudantil (CIE) do
Diretório Central de Estudantes da ATITUS.

O estudante cria a conta, confirma o e-mail, preenche o perfil, paga por PIX e
manda o comprovante no WhatsApp. O DCE confere e aprova no painel; o sistema gera
o QR Code, renderiza a carteirinha (frente e verso) e envia por e-mail
automaticamente. Qualquer pessoa pode validar o documento pelo QR, sem login.

## Como rodar

Pré-requisitos: **Node.js 20+** e **PostgreSQL 14+**.

### 1. Banco

```bash
createdb dce_atitus
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Abra o `.env` e ajuste, no mínimo:

- `DATABASE_URL` — string de conexão do Postgres
- `JWT_SECRET` — gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Depois:

```bash
npx prisma migrate deploy
npm run seed
npm run dev
```

A API sobe em `http://localhost:3333`. O `seed` cria o admin definido em
`ADMIN_EMAIL` / `ADMIN_SENHA`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O site sobe em `http://localhost:5173`.

## Dados de demonstração

Com a API rodando:

```bash
cd backend && npm run seed:demo
```

Cria quatro estudantes, um em cada etapa do fluxo (aguardando pagamento, na fila
do admin e com carteirinha emitida). Senha de todos: `demo1234`.

## Testes

Testes de fumaça que exercitam a API de ponta a ponta — 92 asserções cobrindo
cadastro, login, perfil, upload, pagamento, aprovação, geração da carteirinha e
validação pública:

```bash
cd backend && npm run test:smoke
```

Precisam da API de pé e gravam no banco apontado por `DATABASE_URL`, então rode
contra o banco de desenvolvimento, não o de produção.

**Antes de rodar, desligue o envio de e-mail** (`EMAIL_ENVIO_ATIVO=false` no
`backend/.env`). Os testes cadastram alunos em endereços fictícios; enviar de
verdade para caixas inexistentes gera bounce e derruba a reputação do remetente
no Brevo. O nodemon reinicia sozinho ao salvar o `.env`.

## Conferir o layout da carteirinha

```bash
cd backend && npm run preview:carteirinha
```

Renderiza exemplos em `backend/tmp/preview/`: frente com e sem QR, verso, e um
caso de nome longo para checar quebra de linha.

## Estrutura

```
dce-atitus/
├── backend/                 API REST (Node + Express + Prisma)
│   ├── src/
│   │   ├── config/          env, prisma, passport, storage
│   │   ├── controllers/     auth, perfil, carteirinha, admin, validação
│   │   ├── middlewares/     auth, admin, upload, validação, erros
│   │   ├── routes/
│   │   ├── services/        carteirinha (Puppeteer), qrcode, e-mail, foto
│   │   ├── validators/      schemas Zod
│   │   ├── utils/
│   │   ├── assets/fonts/    fontes embutidas na carteirinha
│   │   └── prisma/          schema, migrations, seed
│   ├── tests/               smoke tests da API
│   └── uploads/             fotos e carteirinhas geradas (fora do git)
├── frontend/                SPA React + Vite
│   └── src/
│       ├── pages/           Landing, Login, Cadastro, Perfil, Carteira,
│       │                    AdminPagamentos, AdminEstudantes, Validar
│       ├── components/      Layout, LogoDce, CarteirinhaVisual, ...
│       ├── contexts/        AuthContext
│       ├── services/        api.js (axios + interceptors)
│       └── styles/          global.css, fontes.css
└── docs/
    └── design-carteirinha.md   especificação do layout do documento
```

## Fluxo de status da carteirinha

```
e-mail confirmado + perfil completo + foto
        │
        ▼
aguardando_pagamento ──(aluno avisa que pagou)──▶ pagamento_em_analise
                                                        │
                                    ┌───────────────────┴───────────────────┐
                                    ▼                                       ▼
                        aprovada                                      rejeitada
              (QR + PNG/PDF + e-mail)                    (aluno reenvia o comprovante)
```

## Rotas da API

| Método | Rota                                | Acesso     |
| ------ | ----------------------------------- | ---------- |
| GET    | `/health`                           | público    |
| GET    | `/config-publica`                   | público    |
| GET    | `/validar/:qrCodeUuid`              | público    |
| POST   | `/auth/register`                    | público    |
| POST   | `/auth/login`                       | público    |
| POST   | `/auth/verificar-email`             | público    |
| POST   | `/auth/reenviar-verificacao`        | público    |
| GET    | `/auth/google`                      | público    |
| GET    | `/auth/google/callback`             | público    |
| GET    | `/auth/me`                          | autenticado |
| GET    | `/perfil`                           | estudante  |
| POST   | `/perfil`                           | estudante  |
| POST   | `/perfil/foto`                      | estudante  |
| GET    | `/carteirinha`                      | estudante  |
| POST   | `/carteirinha/informar-pagamento`   | estudante  |
| POST   | `/carteirinha/reenviar-email`       | estudante  |
| GET    | `/admin/resumo`                     | admin      |
| GET    | `/admin/pagamentos-pendentes`       | admin      |
| PATCH  | `/admin/pagamentos/:id/aprovar`     | admin      |
| PATCH  | `/admin/pagamentos/:id/rejeitar`    | admin      |
| GET    | `/admin/estudantes`                 | admin      |

## Estado atual

O sistema está completo e o envio de e-mail **já está funcionando** via Brevo:
confirmação de cadastro, entrega da carteirinha com anexos e aviso de rejeição
foram testados com e-mails reais chegando na caixa de entrada.

Pendências antes de abrir para os alunos:

1. **Remetente institucional.** Hoje sai de um Gmail do desenvolvedor, que o
   Brevo classifica como *freemail* — entrega pior e maior chance de spam. Quando
   houver acesso a uma caixa `@atitus.edu.br`, cadastre e valide o remetente no
   Brevo e troque `SMTP_FROM_EMAIL`. Melhor ainda se a TI autorizar o Brevo no
   SPF/DKIM do domínio.
2. **Chave SMTP expira.** O Brevo derruba chaves após **90 dias sem uso** e a
   atual vence em 30/07/2027. Se o sistema ficar parado nas férias, os envios
   param sem aviso — vale um lembrete no calendário.
3. Credenciais do Google OAuth (opcional) e a arte oficial do logo.

## O que ainda depende de credenciais externas

Estas duas integrações estão implementadas e testadas, mas ficam desligadas até
receberem credenciais. Sem elas o resto do sistema funciona normalmente.

**Login com Google.** Crie um OAuth Client ID (tipo *Web application*) no
[Google Cloud Console](https://console.cloud.google.com/apis/credentials), com
`http://localhost:3333/auth/google/callback` nas *Authorized redirect URIs*, e
preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Sem isso, o botão some da
tela de login e `/auth/google` responde 503 explicando.

**Envio de e-mail.** Crie uma chave SMTP no [Brevo](https://app.brevo.com/settings/keys/smtp)
(plano gratuito: 300 e-mails/dia) e preencha `SMTP_USER` e `SMTP_PASS`. Atenção: o
`SMTP_USER` é o login que o Brevo gera (algo como `8a1b2c001@smtp-brevo.com`), não
o e-mail com que você entra no site.

O endereço em `SMTP_FROM_EMAIL` precisa estar validado no Brevo, em
*Senders, Domains & Dedicated IPs*. Sem isso o servidor recusa o envio.

Para conferir se ficou tudo certo:

```bash
cd backend && npm run test:email -- seu@email.com
```

O script valida a conexão, autentica, faz um envio real e traduz os erros mais
comuns (chave errada, remetente não validado, porta bloqueada).

Sem isso, a aprovação continua funcionando (a carteirinha é gerada e o painel
avisa o admin que o e-mail não saiu), mas a **confirmação de e-mail do cadastro
não chega ao aluno** — em desenvolvimento o link e o código aparecem no console do
servidor, o que serve para testar, mas não para colocar no ar. Esta é a única
credencial que o sistema realmente precisa antes de ir para produção.

## Deploy

Em produção, além das credenciais acima:

- `NODE_ENV=production`, `API_URL` e `FRONTEND_URL` com os domínios reais
- `GOOGLE_CALLBACK_URL` apontando para o domínio da API
- `VITE_API_URL` (frontend) apontando para o domínio da API
- `npx prisma migrate deploy` no lugar de `migrate dev`
- A pasta `backend/uploads/` precisa de volume persistente — é onde ficam as
  fotos e as carteirinhas emitidas
- O Puppeteer precisa das bibliotecas do Chromium no servidor. Em Debian/Ubuntu:
  `apt-get install -y libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 libgbm1`
