/**
 * Testa a configuração de SMTP: confere as variáveis, valida a conexão e faz um
 * envio real. Roda antes de confiar que o e-mail está funcionando.
 *
 *   npm run test:email -- seu@email.com
 */
import nodemailer from 'nodemailer';
import { env } from './src/config/env.js';

const destino = process.argv[2];

const smtp = {
  host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  fromNome: process.env.SMTP_FROM_NAME ?? 'DCE ATITUS',
  fromEmail: process.env.SMTP_FROM_EMAIL ?? env.dce.email,
};

const mascarar = (v) => (v ? `${v.slice(0, 6)}${'*'.repeat(Math.max(0, v.length - 10))}${v.slice(-4)}` : '(vazio)');

console.log('\n=== Configuração atual (backend/.env) ===\n');
console.log(`  SMTP_HOST       ${smtp.host}`);
console.log(`  SMTP_PORT       ${smtp.port}`);
console.log(`  SMTP_USER       ${smtp.user || '(vazio)'}`);
console.log(`  SMTP_PASS       ${mascarar(smtp.pass)}`);
console.log(`  SMTP_FROM_NAME  ${smtp.fromNome}`);
console.log(`  SMTP_FROM_EMAIL ${smtp.fromEmail || '(vazio)'}`);

const faltando = [
  !smtp.user && 'SMTP_USER',
  !smtp.pass && 'SMTP_PASS',
  !smtp.fromEmail && 'SMTP_FROM_EMAIL',
].filter(Boolean);

if (faltando.length > 0) {
  console.error(`\n✗ Faltam variáveis no .env: ${faltando.join(', ')}`);
  console.error('  Pegue a chave em https://app.brevo.com/settings/keys/smtp\n');
  process.exit(1);
}

const transporte = nodemailer.createTransport({
  host: smtp.host,
  port: smtp.port,
  secure: smtp.port === 465,
  auth: { user: smtp.user, pass: smtp.pass },
});

/** Traduz os erros mais comuns do Brevo em algo acionável. */
function explicar(erro) {
  const texto = `${erro.code ?? ''} ${erro.responseCode ?? ''} ${erro.message ?? ''}`.toLowerCase();

  if (texto.includes('eauth') || texto.includes('535') || texto.includes('authentication')) {
    return [
      'Usuário ou chave SMTP incorretos.',
      'Confira em app.brevo.com > SMTP & API > SMTP.',
      'O SMTP_USER costuma ser algo como 8a1b2c001@smtp-brevo.com (NÃO é o e-mail do login).',
      'A SMTP_PASS é a chave gerada, começa com xsmtpsib-.',
    ];
  }
  if (texto.includes('sender') || texto.includes('5.7.1') || texto.includes('550')) {
    return [
      `O remetente ${smtp.fromEmail} não está autorizado no Brevo.`,
      'Valide o endereço em app.brevo.com > Senders, Domains & Dedicated IPs > Senders.',
      'O Brevo manda um e-mail de confirmação para essa caixa.',
      'Alternativa: troque SMTP_FROM_EMAIL por um endereço que você já validou.',
    ];
  }
  if (texto.includes('etimedout') || texto.includes('econnrefused') || texto.includes('econnreset')) {
    return [
      `Não consegui abrir conexão com ${smtp.host}:${smtp.port}.`,
      'Provavelmente firewall ou a rede bloqueando a porta 587.',
      'Teste a porta 2525 (o Brevo também aceita): SMTP_PORT=2525',
    ];
  }
  if (texto.includes('edns') || texto.includes('enotfound')) {
    return [`Não consegui resolver o host ${smtp.host}. Confira o SMTP_HOST e a conexão.`];
  }
  return [erro.message];
}

console.log('\n=== 1. Testando conexão e autenticação ===\n');
try {
  await transporte.verify();
  console.log('  ✓ Conectou e autenticou no servidor SMTP.');
} catch (erro) {
  console.error('  ✗ Falhou.\n');
  for (const linha of explicar(erro)) console.error(`    ${linha}`);
  console.error('');
  process.exit(1);
}

if (!destino) {
  console.log('\n  Conexão OK. Para fazer um envio real, rode:');
  console.log('    npm run test:email -- seu@email.com\n');
  process.exit(0);
}

console.log(`\n=== 2. Enviando e-mail de teste para ${destino} ===\n`);

const agora = new Date().toLocaleString('pt-BR');
try {
  const info = await transporte.sendMail({
    from: `"${smtp.fromNome}" <${smtp.fromEmail}>`,
    to: destino,
    subject: 'Teste de envio — DCE ATITUS',
    text: `Se você está lendo isto, o SMTP do sistema da carteirinha está funcionando.\n\nEnviado em ${agora}.`,
    html: `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f1f4f3;font-family:'Segoe UI',Helvetica,Arial,sans-serif;padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#0F3B31;padding:26px 32px;">
        <div style="color:#fff;font-size:26px;font-weight:800;">DCE ATITUS</div>
        <div style="color:rgba(255,255,255,.72);font-size:13px;letter-spacing:2px;">CARTEIRA ESTUDANTIL DIGITAL</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <h1 style="margin:0 0 16px;font-size:20px;color:#14201c;">SMTP funcionando ✓</h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3a4744;">
          Este é um envio de teste do sistema da carteirinha estudantil.
          Se ele chegou, os e-mails de confirmação de cadastro e de entrega da
          carteirinha vão chegar também.
        </p>
        <p style="margin:0;font-size:13px;color:#65726d;">Enviado em ${agora}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  });

  console.log(`  ✓ Aceito pelo servidor. messageId: ${info.messageId}`);
  if (info.accepted?.length) console.log(`    aceitos:  ${info.accepted.join(', ')}`);
  if (info.rejected?.length) console.log(`    RECUSADOS: ${info.rejected.join(', ')}`);

  console.log('\n  Agora confira a caixa de entrada (e o spam).');
  console.log('  O histórico de entrega fica em app.brevo.com > Transactional > Logs\n');
} catch (erro) {
  console.error('  ✗ Falhou.\n');
  for (const linha of explicar(erro)) console.error(`    ${linha}`);
  console.error('');
  process.exit(1);
}
