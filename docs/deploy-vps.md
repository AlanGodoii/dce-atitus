# Colocar no ar — VPS

Guia do deploy num servidor próprio (Hostinger KVM 2, Ubuntu 24.04 LTS, São
Paulo). A infraestrutura está no `docker-compose.yml` da raiz; este documento é
a ordem das coisas.

Se um dia a escolha voltar a ser plataforma gerenciada, existe `render.yaml` e o
`docs/deploy.md` descrevendo esse caminho.

## O que roda onde

Quatro contêineres na mesma máquina:

| Contêiner | O que faz | Exposto? |
| --- | --- | --- |
| `proxy` | HTTPS e roteamento por domínio (Caddy) | **sim**, portas 80 e 443 |
| `site` | Arquivos estáticos do React | não |
| `api` | Express, Prisma, Puppeteer | não |
| `db` | PostgreSQL 17 | não |

Só o `proxy` fala com a internet. O banco não tem porta publicada de propósito —
Postgres exposto é alvo de varredura automática o dia inteiro.

Dois volumes guardam o que não pode sumir: `postgres` (o banco) e `dados` (fotos
dos alunos, comprovantes de matrícula e carteirinhas geradas).

## Antes de começar

Tenha em mãos:

- O IP do VPS e a senha de root (a Hostinger mostra no painel após a criação)
- Acesso ao registro.br do `dcematheusteixeira.com.br`
- As credenciais SMTP do Brevo
- Uma chave SSH no seu computador (`ssh-keygen -t ed25519` se ainda não tiver)

## 1. Preparar o servidor

Entre como root pela primeira e última vez:

```bash
ssh root@SEU_IP
```

### Criar um usuário sem privilégios

Rodar tudo como root significa que qualquer descuido é um descuido com poder
total. Crie um usuário e dê a ele acesso ao Docker e ao sudo:

```bash
adduser dce
usermod -aG sudo dce
rsync --archive --chown=dce:dce ~/.ssh /home/dce
```

O `rsync` copia a chave SSH que você já usou para entrar, então o novo usuário
entra sem senha.

Abra **outro terminal** e confirme que funciona antes de seguir:

```bash
ssh dce@SEU_IP
```

### Fechar a porta da frente

Com o login por chave funcionando, desligue o acesso por senha e por root.
Edite `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

E recarregue:

```bash
sudo systemctl reload ssh
```

Isso elimina de uma vez a categoria de ataque mais comum contra VPS: robô
testando senhas em sequência.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Uma ressalva honesta: o Docker escreve regras de rede diretamente e **passa por
cima do ufw** para portas publicadas. Aqui isso não é problema porque as únicas
portas publicadas são a 80 e a 443, que queremos abertas mesmo. Mas guarde a
informação — se um dia alguém publicar a porta do banco "só para testar", o ufw
não vai impedir.

### Atualizações de segurança automáticas

Esta é a contrapartida do VPS: no Render, a plataforma cuidava disso.

```bash
sudo apt update && sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker dce
```

Saia e entre de novo para o grupo valer. Confirme:

```bash
docker compose version
```

## 2. Apontar o DNS

No registro.br, na zona do `dcematheusteixeira.com.br`, três registros do tipo
**A** apontando para o IP do VPS:

| Nome | Tipo | Valor |
| --- | --- | --- |
| (vazio, o domínio raiz) | A | `SEU_IP` |
| `www` | A | `SEU_IP` |
| `api` | A | `SEU_IP` |

Faça isso **antes** de subir os contêineres. O Caddy pede o certificado HTTPS na
Let's Encrypt no primeiro start, e a Let's Encrypt só emite se o domínio já
resolver para a máquina. Se subir antes, o certificado falha e o Caddy fica
tentando de novo com intervalos crescentes.

Os registros de e-mail do Brevo (DKIM, SPF, DMARC) são independentes destes e
continuam onde estão.

Confira a propagação antes de seguir:

```bash
dig +short dcematheusteixeira.com.br
dig +short api.dcematheusteixeira.com.br
```

## 3. Trazer o código

O repositório é privado, então o servidor precisa de uma credencial própria.
Uma chave de deploy é a opção certa: dá acesso **somente leitura** a **este**
repositório, e revogar não afeta mais nada.

No servidor:

```bash
ssh-keygen -t ed25519 -C "vps-dce" -f ~/.ssh/id_deploy -N ""
cat ~/.ssh/id_deploy.pub
```

Copie a saída e cadastre no GitHub, no repositório: **Settings → Deploy keys →
Add deploy key**. Cole a chave, dê um nome (`VPS Hostinger`) e **não** marque
"Allow write access".

Diga ao SSH para usar essa chave com o GitHub, criando `~/.ssh/config`:

```
Host github.com
	IdentityFile ~/.ssh/id_deploy
	IdentitiesOnly yes
```

E clone:

```bash
git clone git@github.com:AlanGodoii/dce-atitus.git ~/dce
cd ~/dce
```

## 4. Preencher o `.env`

```bash
cp .env.example .env
```

Gere os dois segredos e cole no arquivo:

```bash
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -hex 48      # JWT_SECRET
```

Preencha também `ACME_EMAIL`, `SMTP_USER`, `SMTP_PASS`, `DCE_RESPONSAVEL_NOME`,
`ADMIN_EMAIL` e `ADMIN_SENHA`.

Confira `API_URL` e `FRONTEND_URL` com atenção redobrada. **O endereço fica
gravado dentro da imagem do QR Code na hora da emissão** — carteirinha emitida
com o endereço errado tem o QR quebrado para sempre. Existe
`POST /admin/carteirinhas/:id/regerar` para consertar, mas é melhor não precisar.

## 5. Subir

```bash
docker compose up -d --build
```

O primeiro build demora alguns minutos: baixa as imagens, instala o Chromium na
imagem da API e compila o site. Acompanhe:

```bash
docker compose logs -f
```

O que você quer ver: o `db` ficando saudável, a API aplicando as migrações e
respondendo, e o Caddy anunciando os certificados emitidos.

## 6. Criar o administrador

As migrações rodam sozinhas quando o contêiner sobe. O admin não:

```bash
docker compose exec api npm run seed
```

## 7. Testar antes de abrir

Refaça o fluxo inteiro no ambiente real, como se fosse um aluno: criar conta,
confirmar o e-mail, preencher o perfil, enviar foto e comprovante, informar o
pagamento, aprovar pelo painel do admin, receber a carteirinha por e-mail e
**escanear o QR Code com o celular**.

O escaneamento é o teste que não pode ser pulado. É o único que prova que o
domínio, o certificado, a rota pública e o endereço gravado no QR estão todos
coerentes entre si.

Só depois disso divulgue para os alunos.

## Backup

O `scripts/backup.sh` salva o banco e os arquivos. Torne executável e agende:

```bash
chmod +x ~/dce/scripts/backup.sh
crontab -e
```

Uma linha, para rodar às 3 da manhã:

```
0 3 * * * /home/dce/dce/scripts/backup.sh >> /home/dce/backup.log 2>&1
```

Rode uma vez à mão para confirmar que funciona — backup que nunca foi testado é
suposição, não backup:

```bash
~/dce/scripts/backup.sh
```

### O que isso ainda não cobre

Os arquivos ficam em `/var/backups/dce`, **no próprio servidor**. Isso protege
contra apagar algo por engano ou corromper o banco. Não protege contra perder o
VPS — incêndio no datacenter, conta suspensa, invasão.

Para cobrir isso, copie os arquivos para fora periodicamente. O jeito mais
simples e sem custo é rodar isto no **seu computador**, não no servidor:

```bash
scp dce@SEU_IP:/var/backups/dce/*.gz ./backups/
```

Vale combinar com o Daniel uma rotina: uma cópia por mês, guardada por alguém do
DCE. Os dados são de alunos — perder é problema da entidade, não só técnico.

## Atualizar o sistema depois

```bash
cd ~/dce
git pull
docker compose up -d --build
```

O `--build` não é opcional quando o front muda: o endereço da API é gravado no
JavaScript em tempo de build, e sem reconstruir a imagem o site continua o
mesmo. As migrações do banco são aplicadas sozinhas quando a API sobe.

Vale rodar um backup antes de qualquer atualização que mexa no banco.

## Manutenção e vigilância

- **Senha do admin**: trocar no primeiro acesso.
- **E-mail**: `GET /health` mostra se o envio está habilitado e qual é o
  remetente.
- **Chave SMTP do Brevo**: expira após 90 dias sem uso. Se o sistema ficar
  parado nas férias, os envios param sem aviso nenhum.
- **Disco**: `df -h` e `docker system df`. São 100 GB, mas imagens antigas se
  acumulam a cada deploy — `docker image prune -a` limpa.
- **Certificado**: o Caddy renova sozinho. O aviso de falha vai para o
  `ACME_EMAIL`, que por isso precisa ser um endereço lido de verdade.

## Quando a diretoria mudar

O VPS está numa conta da Hostinger e o domínio no registro.br sob o CNPJ do DCE.
Documente com o Daniel quem tem acesso a essas duas contas e ao repositório —
uma entidade estudantil troca de gestão, e o sistema precisa sobreviver à troca.
