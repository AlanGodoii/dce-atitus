import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { enviarRedefinicaoSenha, enviarSenhaAlterada } from './email.service.js';
import { acharPorCodigo, acharPorToken, criarToken, validarRegistro } from './token.service.js';

const TIPO = 'redefinicao_senha';
const CUSTO_BCRYPT = 12;

// Bem menor que as 24h da confirmação de cadastro: este link dá acesso à conta.
// Se a caixa de e-mail for comprometida depois, a janela de risco é curta.
const VALIDADE_HORAS = 1;

/**
 * Dispara o e-mail de redefinição. Quem chama NUNCA deve revelar se a conta
 * existe — a resposta ao usuário é sempre a mesma.
 */
export async function pedirRedefinicao(usuario) {
  const { token, codigo } = await criarToken(usuario.id, TIPO, VALIDADE_HORAS);

  const link = `${env.frontendUrl}/redefinir-senha?token=${token}`;
  const resultado = await enviarRedefinicaoSenha({ usuario, link, codigo, horas: VALIDADE_HORAS });

  if (!resultado.enviado) {
    console.warn(
      `[senha] e-mail para ${usuario.email} não saiu (${resultado.motivo}).\n` +
        `        link: ${link}\n` +
        `        código: ${codigo}`,
    );
  }

  return {
    ...resultado,
    ...(env.isProd ? {} : { dev: { link, codigo } }),
  };
}

/**
 * Troca a senha. Além de gravar o hash novo:
 *
 * - marca `senhaAlteradaEm`, o que derruba as sessões abertas em outros
 *   dispositivos (ver o middleware de autenticação);
 * - marca o e-mail como verificado, porque completar este fluxo prova que a
 *   pessoa tem acesso à caixa;
 * - avisa o dono por e-mail, para ele reagir caso não tenha sido ele.
 */
export async function redefinirSenha({ token, email, codigo, senha }) {
  const registro = token
    ? await acharPorToken(token, TIPO)
    : await acharPorCodigo(email, codigo, TIPO);

  const motivo = validarRegistro(registro);
  if (motivo) return { ok: false, motivo };

  const senhaHash = await bcrypt.hash(senha, CUSTO_BCRYPT);
  const agora = new Date();

  // O `iat` do JWT só tem precisão de SEGUNDOS. Se guardássemos o instante com
  // milissegundos, o token emitido logo depois desta troca (no mesmo segundo)
  // pareceria anterior a ela e seria recusado — o usuário seria deslogado pela
  // própria redefinição. Truncar para o segundo resolve, ao custo de uma janela
  // de 1s em que um token antigo do mesmo segundo ainda passa.
  const marcoSessao = new Date(Math.floor(agora.getTime() / 1000) * 1000);

  const [, usuario] = await prisma.$transaction([
    prisma.tokenVerificacao.update({ where: { id: registro.id }, data: { usadoEm: agora } }),
    prisma.usuario.update({
      where: { id: registro.usuarioId },
      data: {
        senhaHash,
        senhaAlteradaEm: marcoSessao,
        emailVerificadoEm: registro.usuario.emailVerificadoEm ?? agora,
      },
    }),
  ]);

  // Aviso de cortesia: se falhar, a troca continua valendo.
  await enviarSenhaAlterada({ usuario }).catch(() => {});

  return { ok: true, usuario };
}

export const MOTIVOS = {
  invalido: 'Este link de redefinição não é válido. Peça um novo.',
  usado: 'Este link já foi usado. Peça um novo para trocar a senha de novo.',
  expirado: `O link expirou (vale ${VALIDADE_HORAS}h, por segurança). Peça um novo.`,
};
