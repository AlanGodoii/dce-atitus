# DNS do domínio — autenticação de e-mail

Registros que fazem o Brevo poder enviar e-mail como
`dce@dcematheusteixeira.com.br`. Estão documentados aqui porque já se perderam
uma vez: foram cadastrados enquanto o domínio ainda estava em transição, e a
publicação da zona escreveu os padrões por cima.

Nada aqui é segredo — tudo isto fica público no DNS por definição.

## Onde mexer

**Domínio:** registro.br, zona do `dcematheusteixeira.com.br`
**Servidores:** `a.auto.dns.br` e `b.auto.dns.br` (DNS automático do registro.br)
**Origem dos valores:** Brevo → Settings → Senders, Domains & Dedicated IPs →
Domains → `dcematheusteixeira.com.br` → Autenticar domínio

## Os registros

| Nome | Tipo | Valor |
| --- | --- | --- |
| *(vazio)* | TXT | `brevo-code:fb43ead37b26ab0928a4149c97732770` |
| *(vazio)* | TXT | `v=spf1 include:spf.brevo.com ~all` |
| `brevo1._domainkey` | CNAME | `b1.dcematheusteixeira-com-br.dkim.brevo.com` |
| `brevo2._domainkey` | CNAME | `b2.dcematheusteixeira-com-br.dkim.brevo.com` |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |
| `mail` | CNAME | `mail-dcematheusteixeira-com-br.brand.brevosend.com` |
| `r.mail` | CNAME | `mail-dcematheusteixeira-com-br.r.brand.brevosend.com` |
| `img.mail` | CNAME | `mail-dcematheusteixeira-com-br.img.brand.brevosend.com` |

Os cinco primeiros autenticam o domínio. Os três `mail` só deixam link e imagem
com a marca do DCE dentro do e-mail — o envio funciona sem eles.

### Sobre o SPF

Ele **não aparece na lista do Brevo**, e mesmo assim precisa existir.

O Brevo autentica por DKIM, e o DMARC passa com DKIM alinhado — então, do ponto
de vista dele, SPF é dispensável. O problema é o que o registro.br publica
sozinho quando o domínio não declara que envia e-mail:

```
v=spf1 -all
```

Isto diz "nenhum servidor no mundo pode enviar por este domínio". Vários
provedores rejeitam a mensagem antes de chegar a olhar o DKIM. A linha de SPF da
tabela existe para escrever por cima dessa, não para agradar o Brevo.

O mesmo vale para o DMARC: o padrão do registro.br é `p=reject`, o do Brevo é
`p=none`, e **só pode existir um registro `_dmarc`**.

## Armadilhas

**O `@` não funciona.** Nos dois registros do domínio raiz, o campo de nome fica
vazio. O registro.br recusa esse caractere. O próprio Brevo avisa disso na tela.

**Antispoofing automático.** Antes de cadastrar, procure na tela do registro.br
a configuração de e-mail ou antispoofing e declare que o domínio **envia
e-mail**. É ela que publica o `-all` e o `p=reject`.

**Copiar, nunca digitar.** As chaves DKIM são longas e truncar no meio não gera
erro visível — só faz o Brevo dizer "não autenticado" para sempre.

**Publicação.** O registro.br leva de trinta minutos a algumas horas. Depois
disso, e só depois, clicar em "Autenticar domínio" no Brevo.

## Conferir

Perguntando direto ao servidor autoritativo, sem cache no meio:

```powershell
Resolve-DnsName -Name dcematheusteixeira.com.br -Type TXT -Server a.auto.dns.br
Resolve-DnsName -Name brevo1._domainkey.dcematheusteixeira.com.br -Type CNAME -Server a.auto.dns.br
Resolve-DnsName -Name _dmarc.dcematheusteixeira.com.br -Type TXT -Server a.auto.dns.br
```

Deu certo quando os valores da tabela aparecem **e** o `v=spf1 -all` e o
`p=reject` sumiram. Os dois convivendo com os novos é pior que a situação
atual — SPF duplicado é erro de configuração, e aí o provedor rejeita em vez de
ignorar.

## Depois que autenticar

Trocar no `.env` de produção:

```
SMTP_FROM_EMAIL=dce@dcematheusteixeira.com.br
```

Não é preciso existir caixa de e-mail nesse endereço — domínio autenticado por
DNS basta para enviar. As respostas dos alunos vão para o `SMTP_REPLY_TO`, que
aponta para o `dce@atitus.edu.br`.

Enquanto isso não acontece, o remetente segue sendo o Gmail do desenvolvedor.
Funciona, mas mostra `@brevosend.com` como remetente técnico e sofre atraso de
greylisting.
