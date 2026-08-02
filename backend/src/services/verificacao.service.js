import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { enviarConfirmacaoEmail } from './email.service.js';
import { acharPorCodigo, acharPorToken, criarToken, validarRegistro } from './token.service.js';

const TIPO = 'confirmacao_email';
const VALIDADE_HORAS = 24;

/**
 * Cria um token de confirmação e dispara o e-mail. Invalida os anteriores para
 * que só o último link recebido funcione.
 *
 * Devolve `{ enviado, motivo, dev }`. Em desenvolvimento, `dev` traz o link e o
 * código para dar pra testar o fluxo sem SMTP configurado.
 */
export async function enviarVerificacao(usuario) {
  const { token, codigo } = await criarToken(usuario.id, TIPO, VALIDADE_HORAS);

  const link = `${env.frontendUrl}/verificar-email?token=${token}`;
  const resultado = await enviarConfirmacaoEmail({ usuario, link, codigo, horas: VALIDADE_HORAS });

  if (!resultado.enviado) {
    console.warn(
      `[verificacao] e-mail para ${usuario.email} não saiu (${resultado.motivo}).\n` +
        `             link: ${link}\n` +
        `             código: ${codigo}`,
    );
  }

  return {
    ...resultado,
    // Nunca em produção: seria entregar a chave de verificação a quem pedir.
    ...(env.isProd ? {} : { dev: { link, codigo } }),
  };
}

/** Confirma pelo token do link. */
export async function verificarPorToken(token) {
  return concluir(await acharPorToken(token, TIPO));
}

/** Confirma pelo código de 6 dígitos + e-mail. */
export async function verificarPorCodigo(email, codigo) {
  return concluir(await acharPorCodigo(email, codigo, TIPO));
}

async function concluir(registro) {
  const motivo = validarRegistro(registro);
  if (motivo) return { ok: false, motivo };

  // Já estava verificado (clicou no link duas vezes): trata como sucesso.
  if (registro.usuario.emailVerificadoEm) {
    return { ok: true, usuario: registro.usuario, jaEstava: true };
  }

  const [, usuario] = await prisma.$transaction([
    prisma.tokenVerificacao.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    }),
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: { emailVerificadoEm: new Date() },
    }),
  ]);

  return { ok: true, usuario };
}

export const MOTIVOS = {
  invalido: 'Este link de confirmação não é válido. Peça um novo e-mail de confirmação.',
  usado: 'Este link já foi usado. Peça um novo e-mail de confirmação.',
  expirado: `O link expirou (vale ${VALIDADE_HORAS}h). Peça um novo e-mail de confirmação.`,
};
