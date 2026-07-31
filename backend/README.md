# Backend — Carteirinha Estudantil Digital DCE ATITUS

API REST em Node.js + Express + Prisma + PostgreSQL.

## Rodando localmente

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL e JWT_SECRET
npx prisma migrate dev
npm run seed           # cria o admin inicial
npm run dev
```

A API sobe em `http://localhost:3333`.

## Scripts

| Script                   | O que faz                                  |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | sobe com nodemon (reload automático)       |
| `npm start`              | sobe em modo produção                      |
| `npm run prisma:migrate` | cria/aplica migration em dev               |
| `npm run prisma:deploy`  | aplica migrations em produção              |
| `npm run prisma:studio`  | abre o Prisma Studio para ver o banco      |
| `npm run seed`           | cria/atualiza o usuário admin              |
| `npm run seed:demo`      | cria estudantes de demonstração            |
| `npm run limpar:teste`   | remove as contas criadas pelos testes      |
| `npm run test:smoke`     | roda os testes de fumaça contra a API      |
| `npm run preview:carteirinha` | renderiza exemplos do documento       |
| `npm run test:email`     | testa a conexão SMTP e faz um envio real   |

## Rotas

| Método | Rota                              | Auth   | Descrição                                       |
| ------ | --------------------------------- | ------ | ----------------------------------------------- |
| GET    | `/`                               | —      | índice da API                                    |
| GET    | `/health`                         | —      | healthcheck + o que está configurado             |
| GET    | `/config-publica`                 | —      | dados do DCE (PIX, WhatsApp) para a SPA          |
| GET    | `/validar/:qrCodeUuid`            | —      | validação pública lida pelo QR                   |
| POST   | `/auth/register`                  | —      | cadastro com e-mail e senha                      |
| POST   | `/auth/login`                     | —      | login, devolve JWT                               |
| POST   | `/auth/verificar-email`           | —      | confirma pelo token do link ou pelo código       |
| POST   | `/auth/reenviar-verificacao`      | —      | reenvia o e-mail de confirmação                  |
| GET    | `/auth/me`                        | Bearer | usuário logado + se o perfil está completo       |
| GET    | `/auth/google`                    | —      | inicia o OAuth do Google                         |
| GET    | `/auth/google/callback`           | —      | callback, redireciona para a SPA com o token     |
| GET    | `/perfil`                         | Bearer | perfil do estudante logado                       |
| POST   | `/perfil`                         | Bearer | cria/atualiza o perfil                           |
| POST   | `/perfil/foto`                    | Bearer | upload da foto (campo `foto`, multipart)         |
| GET    | `/carteirinha`                    | Bearer | estado atual + dados do PIX                      |
| POST   | `/carteirinha/informar-pagamento` | Bearer | aluno avisa que enviou o comprovante             |
| POST   | `/carteirinha/reenviar-email`     | Bearer | reenvia o arquivo já gerado                      |
| GET    | `/admin/resumo`                   | Admin  | contadores do painel                             |
| GET    | `/admin/pagamentos-pendentes`     | Admin  | fila de conferência                              |
| PATCH  | `/admin/pagamentos/:id/aprovar`   | Admin  | gera QR + carteirinha + envia e-mail             |
| PATCH  | `/admin/pagamentos/:id/rejeitar`  | Admin  | rejeita e avisa o aluno                          |
| GET    | `/admin/estudantes`               | Admin  | lista/busca todos os cadastros                   |

`POST /carteirinha/informar-pagamento` não estava na especificação original, mas
o fluxo precisava dele: é o que move a carteirinha de `aguardando_pagamento` para
`pagamento_em_analise` e cria o registro em `pagamentos` que faz o aluno aparecer
na fila do admin. Sem esse passo o DCE não teria como saber que alguém pagou.

## Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   crie uma credencial **OAuth 2.0 Client ID** do tipo *Web application*.
2. Em *Authorized redirect URIs*, adicione:
   `http://localhost:3333/auth/google/callback`
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

Sem essas variáveis o login social fica desligado e `/auth/google` responde
`503` com uma mensagem explicando — o resto da API continua funcionando normal.

## Confirmação de e-mail

Checar o registro MX do domínio prova só que o domínio recebe mensagens — não que
a caixa exista nem que seja do usuário. `naoexiste123@gmail.com` passa nesse teste.
A única forma de provar que um e-mail é real é mandar algo para ele, então:

1. O cadastro cria a conta com `emailVerificadoEm = null` e dispara um e-mail com
   um **link** e um **código de 6 dígitos**, válidos por 24 h.
2. **Toda a área do estudante** (`/perfil/*` e `/carteirinha/*`) responde **403**
   até confirmar — só `/auth/me` continua acessível, para a SPA saber o estado e
   levar o aluno à tela de confirmação com a notificação de acesso bloqueado.
3. Contas criadas pelo Google já nascem confirmadas — o Google é quem atesta.
4. Domínios de e-mail temporário (mailinator, yopmail, 10minutemail e afins) são
   recusados no cadastro por `utils/dominios-descartaveis.js`.

Guardamos o **SHA-256** do token, nunca o token em claro: se o banco vazar,
ninguém confirma conta alheia com o que estiver lá dentro. Pedir um reenvio
invalida os links anteriores, então só o último e-mail recebido funciona.

**Sem SMTP configurado**, o link e o código são impressos no console do servidor e
devolvidos no campo `verificacao.dev` da resposta do cadastro — mas **só quando
`NODE_ENV !== 'production'`**. É o que permite testar o fluxo sem o Brevo ligado.

### Desligue o envio antes de rodar os testes

Os testes de fumaça cadastram alunos em endereços fictícios (`verif.1785…@gmail.com`).
Com o SMTP ativo, cada rodada dispara ~15 e-mails para caixas que não existem, e
o Gmail devolve todos como *hard bounce*. Taxa de bounce alta suja a reputação do
remetente e o Brevo suspende contas por isso.

Por isso existe o interruptor `EMAIL_ENVIO_ATIVO`. Antes de rodar a suíte:

```bash
# no backend/.env
EMAIL_ENVIO_ATIVO=false
```

O nodemon observa o `.env` e reinicia sozinho. O log de inicialização mostra o
estado atual (`habilitado`, `nao configurado` ou `DESATIVADO por …`). Lembre de
voltar para `true` depois.

## Decisões que valem registrar

- **`bcryptjs` em vez de `bcrypt`**: o `bcrypt` é um módulo nativo e exige
  toolchain de compilação no Windows. O `bcryptjs` é a mesma função, em JS puro,
  compatível com os hashes gerados pelo `bcrypt`. Custo 12.
- **Login não diz se o e-mail existe**: senha errada e e-mail inexistente
  devolvem a mesma mensagem, e o caso "não existe" ainda roda um `bcrypt.compare`
  descartável para não entregar a resposta mais rápido e revelar a diferença.
- **`requireAuth` consulta o banco**: custa uma query por request, mas conta
  excluída ou role alterada passam a valer na hora, sem esperar o JWT expirar.
- **`qr_code_uuid` é nullable**: o QR só nasce quando o admin aprova o pagamento,
  como pede o fluxo — antes disso não existe nem no banco.
- **Vínculo automático com o Google** só acontece se o Google informar que o
  e-mail é verificado; caso contrário alguém poderia assumir uma conta existente.
- **`carteirinhas` é uma lista por perfil** (e não 1:1), para permitir a
  renovação anual sem apagar o histórico. As consultas pegam sempre a mais recente.
- **A aprovação não é desfeita se a geração ou o e-mail falharem.** Confirmar o
  pagamento é o passo que não pode se perder — o admin conferiu o comprovante no
  WhatsApp e isso não dá para refazer. Puppeteer e SMTP rodam depois da transação,
  e a resposta diz exatamente o que deu certo para o painel avisar o admin.
- **A validação pública mascara o CPF** (`***.456.789-**`). Quem confere a
  carteirinha no caixa não precisa do número inteiro, e ele fica num endereço
  público.
- **Dados impressos ficam travados após a emissão.** Mudar nome, CPF ou matrícula
  depois de aprovada faria o documento em circulação divergir do banco; nesse caso
  a API responde 409 e manda o aluno falar com o DCE.
- **Fontes embutidas em base64** no HTML da carteirinha (`src/assets/fonts/`). O
  documento sai idêntico em qualquer servidor, sem depender das fontes do sistema.
- **A arte oficial do logo é opcional.** Se existir `src/assets/logo-dce-branco.png`,
  o template usa esse arquivo; senão, desenha o wordmark em CSS.
