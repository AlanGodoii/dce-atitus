import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';

/**
 * Mecânica comum aos tokens que mandamos por e-mail (confirmação de cadastro e
 * redefinição de senha).
 *
 * Tudo aqui é escopado por `tipo`. Sem isso, um token de redefinição de senha
 * poderia ser consumido pelo fluxo de confirmação — e pedir um novo e-mail de
 * confirmação invalidaria uma redefinição pendente.
 */

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Cria um token novo e invalida os anteriores do MESMO tipo, para que só o
 * último e-mail recebido funcione.
 *
 * @returns {{ token: string, codigo: string, expiraEm: Date }}
 */
export async function criarToken(usuarioId, tipo, validadeHoras) {
  const token = crypto.randomBytes(32).toString('hex');
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiraEm = new Date(Date.now() + validadeHoras * 3600 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.tokenVerificacao.updateMany({
      where: { usuarioId, tipo, usadoEm: null },
      data: { usadoEm: new Date() },
    });
    await tx.tokenVerificacao.create({
      data: { usuarioId, tipo, tokenHash: hash(token), codigo, expiraEm },
    });
  });

  return { token, codigo, expiraEm };
}

/** Busca pelo token do link, já conferindo o tipo. */
export async function acharPorToken(token, tipo) {
  if (typeof token !== 'string' || token.length !== 64) return null;
  const registro = await prisma.tokenVerificacao.findUnique({
    where: { tokenHash: hash(token) },
    include: { usuario: true },
  });
  return registro?.tipo === tipo ? registro : null;
}

/** Busca pelo código de 6 dígitos + e-mail, já conferindo o tipo. */
export async function acharPorCodigo(email, codigo, tipo) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) return null;

  return prisma.tokenVerificacao.findFirst({
    where: { usuarioId: usuario.id, tipo, codigo, usadoEm: null },
    orderBy: { criadoEm: 'desc' },
    include: { usuario: true },
  });
}

/** Motivo pelo qual um registro não serve, ou null se estiver válido. */
export function validarRegistro(registro) {
  if (!registro) return 'invalido';
  if (registro.usadoEm) return 'usado';
  if (registro.expiraEm < new Date()) return 'expirado';
  return null;
}

export async function marcarUsado(id) {
  return prisma.tokenVerificacao.update({ where: { id }, data: { usadoEm: new Date() } });
}
