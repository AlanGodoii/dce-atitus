import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { enviarConfirmacaoEmail } from './email.service.js';

const VALIDADE_HORAS = 24;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Cria um token de confirmação e dispara o e-mail. Invalida os anteriores para
 * que só o último link recebido funcione.
 *
 * Devolve `{ enviado, motivo, dev }`. Em desenvolvimento, `dev` traz o link e o
 * código para dar pra testar o fluxo sem SMTP configurado.
 */
export async function enviarVerificacao(usuario) {
  const token = crypto.randomBytes(32).toString('hex');
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiraEm = new Date(Date.now() + VALIDADE_HORAS * 3600 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.tokenVerificacao.updateMany({
      where: { usuarioId: usuario.id, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    await tx.tokenVerificacao.create({
      data: { usuarioId: usuario.id, tokenHash: hash(token), codigo, expiraEm },
    });
  });

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
  if (typeof token !== 'string' || token.length !== 64) return { ok: false, motivo: 'invalido' };
  const registro = await prisma.tokenVerificacao.findUnique({
    where: { tokenHash: hash(token) },
    include: { usuario: true },
  });
  return concluir(registro);
}

/** Confirma pelo código de 6 dígitos + e-mail. */
export async function verificarPorCodigo(email, codigo) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return { ok: false, motivo: 'invalido' };

  const registro = await prisma.tokenVerificacao.findFirst({
    where: { usuarioId: usuario.id, codigo, usadoEm: null },
    orderBy: { criadoEm: 'desc' },
    include: { usuario: true },
  });

  return concluir(registro);
}

async function concluir(registro) {
  if (!registro) return { ok: false, motivo: 'invalido' };
  if (registro.usadoEm) return { ok: false, motivo: 'usado' };
  if (registro.expiraEm < new Date()) return { ok: false, motivo: 'expirado' };

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
