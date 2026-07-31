import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { formatarDataBr } from '../utils/validadores.js';

const smtp = {
  host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  user: process.env.SMTP_USER ?? '',
  pass: process.env.SMTP_PASS ?? '',
  fromNome: process.env.SMTP_FROM_NAME ?? 'DCE ATITUS',
  fromEmail: process.env.SMTP_FROM_EMAIL ?? env.dce.email,
};

/**
 * Interruptor geral de envio. Existe por causa dos testes de fumaça: eles
 * cadastram alunos em endereços fictícios, e disparar de verdade para caixas
 * inexistentes gera hard bounce — o que suja a reputação do remetente e pode
 * fazer o Brevo suspender a conta. Deixe `false` ao rodar a suíte.
 */
const envioAtivo = process.env.EMAIL_ENVIO_ATIVO !== 'false';

const smtpCompleto = Boolean(smtp.user && smtp.pass && smtp.fromEmail);

export const emailHabilitado = envioAtivo && smtpCompleto;

/** Texto curto para o log de inicialização e para o /health. */
export const statusEmail = emailHabilitado
  ? `habilitado (remetente: ${smtp.fromEmail})`
  : !smtpCompleto
    ? 'nao configurado (falta SMTP_USER/SMTP_PASS)'
    : 'DESATIVADO por EMAIL_ENVIO_ATIVO=false';

let transporter = null;

function obterTransporter() {
  if (!emailHabilitado) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
  }
  return transporter;
}

/**
 * Envia e devolve o resultado em vez de estourar: a aprovacao do pagamento nao
 * pode ser desfeita porque o SMTP caiu. Quem chama decide o que fazer com a
 * falha (aqui, mostrar no painel que o e-mail nao saiu e oferecer reenvio).
 */
export async function enviarEmail({ para, assunto, html, texto, anexos = [] }) {
  const transporte = obterTransporter();

  if (!transporte) {
    const motivo = !envioAtivo
      ? 'Envio desativado nesta instância (EMAIL_ENVIO_ATIVO=false).'
      : 'SMTP não configurado (defina SMTP_USER e SMTP_PASS).';
    console.warn(`[email] envio para ${para} foi pulado — ${motivo}`);
    return { enviado: false, motivo };
  }

  try {
    const info = await transporte.sendMail({
      from: `"${smtp.fromNome}" <${smtp.fromEmail}>`,
      to: para,
      subject: assunto,
      text: texto,
      html,
      attachments: anexos,
    });
    return { enviado: true, messageId: info.messageId };
  } catch (erro) {
    console.error(`[email] falha ao enviar para ${para}:`, erro.message);
    return { enviado: false, motivo: erro.message };
  }
}

// --- templates --------------------------------------------------------------

const VERDE = '#0F3B31';

function layout(titulo, corpoHtml) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f4f3;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f4f3;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06);">
        <tr><td style="background:${VERDE};padding:26px 32px;">
          <div style="color:#fff;font-size:26px;font-weight:800;letter-spacing:-.5px;">DCE ATITUS</div>
          <div style="color:rgba(255,255,255,.72);font-size:13px;letter-spacing:2px;margin-top:2px;">CARTEIRA ESTUDANTIL DIGITAL</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:21px;color:#14201c;">${titulo}</h1>
          ${corpoHtml}
        </td></tr>
        <tr><td style="background:#f7f9f8;padding:20px 32px;border-top:1px solid #e4e9e7;color:#65726d;font-size:13px;line-height:1.6;">
          Dúvidas? Fale com o DCE pelo WhatsApp ou responda este e-mail.<br>
          <strong style="color:${VERDE};">${env.dce.nome}</strong> &middot; ${env.dce.email}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const paragrafo = (texto) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3a4744;">${texto}</p>`;

export async function enviarCarteirinhaAprovada({ usuario, carteirinha, caminhos }) {
  const validade = formatarDataBr(carteirinha.dataValidade);
  const linkArea = `${env.frontendUrl}/carteirinha`;

  const html = layout(
    `Sua carteirinha está pronta, ${usuario.nome.split(' ')[0]}!`,
    `
    ${paragrafo('Seu pagamento foi confirmado e a sua Carteira de Identificação Estudantil já está emitida.')}
    ${paragrafo(`Ela é <strong>válida até ${validade}</strong>. Os arquivos estão anexados neste e-mail: a frente, o verso e um PDF pronto para impressão.`)}
    ${paragrafo('O QR Code impresso na frente permite que qualquer estabelecimento confirme a autenticidade do documento na hora.')}
    ${paragrafo('<strong>Carteirinha física:</strong> ela está inclusa e deve ser retirada no DCE. Nossa equipe entra em contato pelo WhatsApp para combinar a retirada.')}
    <p style="margin:26px 0 8px;">
      <a href="${linkArea}" style="display:inline-block;background:${VERDE};color:#fff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;">Ver minha carteirinha</a>
    </p>`,
  );

  const texto =
    `Sua carteirinha do DCE ATITUS foi emitida e é válida até ${validade}. ` +
    `Os arquivos estão anexados. Acesse ${linkArea} para consultar quando quiser.`;

  return enviarEmail({
    para: usuario.email,
    assunto: 'Sua Carteirinha Estudantil DCE ATITUS está pronta',
    html,
    texto,
    anexos: [
      { filename: 'carteirinha-frente.png', path: caminhos.frente },
      { filename: 'carteirinha-verso.png', path: caminhos.verso },
      { filename: 'carteirinha-dce-atitus.pdf', path: caminhos.pdf },
    ],
  });
}

export async function enviarConfirmacaoEmail({ usuario, link, codigo, horas }) {
  const html = layout(
    'Confirme seu e-mail',
    `
    ${paragrafo(`Olá, ${usuario.nome.split(' ')[0]}! Falta um passo para ativar sua conta no DCE ATITUS.`)}
    ${paragrafo('Precisamos confirmar que este e-mail é seu, porque é para cá que a sua carteirinha vai ser enviada quando for emitida.')}
    <p style="margin:26px 0;">
      <a href="${link}" style="display:inline-block;background:${VERDE};color:#fff;text-decoration:none;padding:14px 30px;border-radius:8px;font-size:15px;font-weight:600;">Confirmar meu e-mail</a>
    </p>
    ${paragrafo('Ou digite este código no site:')}
    <p style="margin:0 0 18px;font-size:32px;font-weight:800;letter-spacing:8px;color:${VERDE};font-family:monospace;">${codigo}</p>
    ${paragrafo(`<span style="color:#6b7873;font-size:13px;">O link e o código valem por ${horas} horas. Se não foi você que criou esta conta, ignore este e-mail.</span>`)}`,
  );

  return enviarEmail({
    para: usuario.email,
    assunto: `Confirme seu e-mail — código ${codigo}`,
    html,
    texto:
      `Confirme seu e-mail no DCE ATITUS.\n\nLink: ${link}\nCódigo: ${codigo}\n\n` +
      `Vale por ${horas} horas. Se não foi você, ignore este e-mail.`,
  });
}

export async function enviarPagamentoRejeitado({ usuario, motivo }) {
  const html = layout(
    'Não conseguimos confirmar seu pagamento',
    `
    ${paragrafo(`Olá, ${usuario.nome.split(' ')[0]}. O DCE analisou o comprovante enviado e não conseguiu confirmar o pagamento da sua carteirinha.`)}
    ${motivo ? paragrafo(`<strong>Observação do DCE:</strong> ${motivo}`) : ''}
    ${paragrafo(`Reenvie o comprovante pelo WhatsApp e avise pela área do estudante que o envio foi refeito. Assim que confirmarmos, a carteirinha é emitida na hora.`)}
    <p style="margin:26px 0 8px;">
      <a href="${env.frontendUrl}/carteirinha" style="display:inline-block;background:${VERDE};color:#fff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;">Reenviar comprovante</a>
    </p>`,
  );

  return enviarEmail({
    para: usuario.email,
    assunto: 'Pagamento da carteirinha não confirmado - DCE ATITUS',
    html,
    texto: `Não conseguimos confirmar seu pagamento.${motivo ? ` Observação: ${motivo}.` : ''} Reenvie o comprovante pelo WhatsApp.`,
  });
}
