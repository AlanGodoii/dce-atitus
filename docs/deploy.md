# Colocar no ar — Render (caminho alternativo)

> **O deploy do DCE é em VPS.** O guia em uso é o
> [`deploy-vps.md`](deploy-vps.md). Este documento descreve a alternativa em
> plataforma gerenciada, mantida porque a decisão foi por PIX e preço, não por
> limitação técnica — se um dia isso mudar, o caminho está aqui pronto.

Guia do deploy no Render. A infraestrutura está descrita em `render.yaml`, na
raiz do repositório — este documento explica a ordem das coisas e o que precisa
ser preenchido à mão.

## O que o sistema exige da hospedagem

Três coisas descartam as opções mais baratas:

**Chromium.** A carteirinha é renderizada por um navegador de verdade
(Puppeteer). O `backend/Dockerfile` instala o Chromium do Debian e aponta o
Puppeteer para ele — por isso o deploy é por Docker, não pelo runtime Node
padrão.

**Disco persistente.** Fotos, carteirinhas geradas e comprovantes de matrícula
são arquivos. O sistema de arquivos de um contêiner é descartado a cada deploy;
sem um volume, os documentos de todos os alunos sumiriam. O volume monta em
`/app/dados` e a variável `DADOS_DIR` diz ao código onde procurar.

**PostgreSQL.** O schema é relacional e depende de restrições no banco —
principalmente as de unicidade de CPF e de QR Code, que são o que impede dois
alunos de receberem o mesmo código.

## Ordem do deploy

### 1. Criar os serviços

No Render, **New → Blueprint**, apontando para este repositório. Ele lê o
`render.yaml` e cria a API, o banco e o site de uma vez.

### 2. Preencher os segredos

O blueprint deixa em branco (`sync: false`) o que não pode ficar versionado.
Preencha no painel, em Environment:

| Variável | O que é |
| --- | --- |
| `SMTP_USER` | Login SMTP do Brevo (`8a1b2c001@smtp-brevo.com`) |
| `SMTP_PASS` | Chave SMTP do Brevo (começa com `xsmtpsib-`) |
| `ADMIN_EMAIL` | E-mail de acesso do DCE ao painel |
| `ADMIN_SENHA` | Senha inicial, **trocada no primeiro acesso** |

O `JWT_SECRET` é gerado pelo Render. Trocar depois desloga todos os alunos.

### 3. Criar o administrador

As migrações rodam sozinhas quando o contêiner sobe. O admin não — rode uma vez,
pelo Shell do Render:

```bash
npm run seed
```

### 4. Apontar o domínio

No Render, adicione os domínios personalizados em cada serviço:

| Serviço | Domínio |
| --- | --- |
| `dce-atitus-site` | `dcematheusteixeira.com.br` e `www.dcematheusteixeira.com.br` |
| `dce-atitus-api` | `api.dcematheusteixeira.com.br` |

O Render mostra os registros DNS a cadastrar no registro.br. O certificado HTTPS
é emitido automaticamente depois que o DNS propaga.

### 5. Conferir os endereços

Confirme que `API_URL` e `FRONTEND_URL` batem com os domínios reais **antes de
emitir qualquer carteirinha**. O endereço fica gravado dentro da imagem do QR
Code na hora da emissão — carteirinha emitida com o endereço errado tem o QR
quebrado para sempre.

Se acontecer por acidente, existe `POST /admin/carteirinhas/:id/regerar`, que
refaz os arquivos mantendo o mesmo código.

### 6. Testar antes de abrir

Refaça o fluxo inteiro no ambiente real: criar conta, confirmar e-mail,
preencher perfil, enviar foto e comprovante, informar pagamento, aprovar como
admin, receber a carteirinha por e-mail e escanear o QR com o celular.

Só depois disso divulgue para os alunos.

## Backup

O plano do banco no Render inclui backup diário automático, com retenção de
alguns dias. Isso cobre o banco — **não cobre o disco** com fotos e
comprovantes.

Vale baixar uma cópia do disco periodicamente, sobretudo depois de períodos de
muita emissão. Perder o banco significa perder o registro de todas as
carteirinhas; perder o disco significa perder os documentos, que podem ser
regerados a partir do banco (menos as fotos e comprovantes enviados pelos
alunos, que não têm como recuperar).

## Custo

| Item | Plano | USD/mês |
| --- | --- | --- |
| API | Starter (512 MB) | 7 |
| PostgreSQL | Basic 256 MB | 6 |
| Disco 10 GB | — | 2,50 |
| Site | Static | 0 |

Cerca de **US$ 15,50/mês**. Confirme os valores no site do Render, que mudam.

**Sobre a memória:** 512 MB é apertado para o Puppeteer — o Chromium sozinho usa
uns 300 MB durante a renderização. Como as aprovações são manuais e uma de cada
vez, deve dar conta. Se o contêiner começar a morrer por falta de memória
durante a geração, o próximo degrau é o plano Standard (2 GB, US$ 25).

A aprovação do pagamento é gravada **antes** da geração dos arquivos, então uma
falha de memória não perde a confirmação: o admin vê o aviso e regera.

## Depois do deploy

- Trocar a senha do admin no primeiro acesso.
- Conferir se o e-mail está saindo (`GET /health` mostra o estado).
- A chave SMTP do Brevo **expira após 90 dias sem uso** — se o sistema ficar
  parado nas férias, os envios param sem aviso.
