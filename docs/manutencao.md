# Manutenção — o que vigiar para o site não cair

Escrito em 03/08/2026, com os números reais do primeiro dia em produção. Serve
para responder uma pergunta que volta sempre: *o que pode derrubar isso?*

A resposta curta é que quase nada derruba por acidente — os contêineres sobem
sozinhos, o Docker sobe no boot, o certificado renova automático e as
atualizações de segurança se aplicam sozinhas. O que ameaça de verdade são
**prazos e cotas**, não falha técnica.

## Por ordem de risco real

### 1. Cota de e-mail do Brevo

O maior risco no dia da divulgação. O plano gratuito tem limite diário de
envios, e **cada aluno consome pelo menos dois**: a confirmação de cadastro e a
entrega da carteirinha. Correções e reenvios somam mais.

Se cem alunos se cadastrarem numa tarde, o limite pode estourar — e o sintoma é
cruel: o aluno se cadastra, não recebe o código, e desiste em silêncio. Ninguém
reclama, e o DCE só descobre pelo baixo número de emissões.

**Antes de divulgar:** confira o limite do plano em `app.brevo.com`, e estime
contra o número de alunos esperados. Se for apertado, o plano pago mais barato
resolve, ou escalona-se a divulgação por curso.

**Durante o piloto:** `Transactional → Logs` mostra o que saiu e o que foi
recusado.

### 2. A chave SMTP expira sem uso

O Brevo desativa chaves SMTP após **90 dias sem nenhum envio**. Como o sistema
tem sazonalidade forte — muita emissão no início do semestre, silêncio nas
férias —, é plausível passar três meses parado.

O sintoma é o mesmo do item anterior: e-mails somem sem erro visível ao aluno.

**Mitigação:** um envio de teste a cada dois meses mantém a chave viva.

```bash
cd ~/dce && docker compose exec api npm run test:email -- seu@email.com
```

### 3. Renovações que se pagam

| O quê | Vence | Onde |
| --- | --- | --- |
| VPS Hostinger | 02/08/2027 | painel Hostinger, ~R$ 88,99/mês |
| Domínio | 02/08/2028 | registro.br, CNPJ do DCE |

Domínio vencido derruba tudo de uma vez: site, e-mail e **os QR Codes já
impressos**. Vale colocar as duas datas no calendário do DCE, não só no seu.

### 4. Cache de build do Docker

Cada `docker compose up --build` deixa camadas para trás. Depois de quatro
deploys já eram 3,3 GB.

Não é urgente — são 96 GB de disco, e o sistema todo (banco, fotos,
comprovantes, carteirinhas) ocupava 3 MB no primeiro dia. Mas a cada cem
deploys isso incomoda.

**A cada poucos meses, ou depois de uma sequência de deploys:**

```bash
docker builder prune -f
docker image prune -f
```

### 5. Backup só existe dentro do servidor

O cron das 3h grava em `/var/backups/dce`, na própria máquina. Protege contra
apagar algo por engano ou corromper o banco. **Não protege contra perder o
VPS.**

Para cobrir isso, rode no seu computador de tempos em tempos:

```bash
scp dce@179.197.73.208:/var/backups/dce/*.gz ./backups/
```

Vale combinar com o DCE uma cópia mensal guardada por alguém da entidade. São
dados de aluno — CPF, foto e comprovante de matrícula.

### 6. Avisos de certificado

O Caddy renova sozinho. Se falhar, a Let's Encrypt avisa em
`dce@atitus.edu.br`, que é o `ACME_EMAIL`. É mais um motivo para essa caixa ter
dono de verdade.

## Como olhar o estado

Um comando responde quase tudo:

```bash
ssh dce@179.197.73.208
cd ~/dce && docker compose ps && df -h / && free -h && docker system df
```

O que se espera ver: quatro contêineres `Up`, `api` e `db` como `healthy`,
disco abaixo de 50%, memória com folga.

Para investigar erro que o aluno não reportaria:

```bash
docker compose logs api --since 24h | grep -iE 'erro|error|falha'
```

## Números do primeiro dia, como referência

| | |
| --- | --- |
| Disco | 6,6 GB de 96 GB (7%) |
| Memória em uso | 689 MB de 7,8 GB |
| Dados dos alunos | 3 MB |
| Cache de build do Docker | 3,3 GB |

Com 3 MB para dois alunos, mil alunos dariam algo perto de 1,5 GB. Espaço não
vai ser problema.
