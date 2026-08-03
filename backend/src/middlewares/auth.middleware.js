import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { verificarToken } from '../utils/jwt.js';

function extrairToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [tipo, token] = header.split(' ');
  if (tipo?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

/**
 * Exige um JWT valido e carrega o usuario do banco. Consultar o banco a cada
 * request custa uma query, mas garante que role revogada ou conta excluida
 * deixem de valer imediatamente, sem esperar o token expirar.
 */
export async function requireAuth(req, _res, next) {
  try {
    const token = extrairToken(req);
    if (!token) throw AppError.naoAutorizado('Token de acesso não informado.');

    let payload;
    try {
      payload = verificarToken(token);
    } catch (erro) {
      if (erro.name === 'TokenExpiredError') {
        throw AppError.naoAutorizado('Sessão expirada. Faça login novamente.');
      }
      throw AppError.naoAutorizado('Token inválido.');
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        whatsapp: true,
        senhaAlteradaEm: true,
      },
    });

    if (!usuario) throw AppError.naoAutorizado('Usuário do token não existe mais.');

    // Token emitido antes da ultima troca de senha nao vale mais. E o que faz a
    // redefinicao expulsar quem estiver logado em outro aparelho — inclusive
    // alguem que tenha invadido a conta.
    //
    // Usa o `ms` do token, em milissegundos. O `iat` e a reserva para os tokens
    // emitidos antes desse campo existir: eles so tem segundos, entao mantem a
    // janela antiga de 1s ate expirarem sozinhos.
    const emitidoEm = payload.ms ?? payload.iat * 1000;
    if (usuario.senhaAlteradaEm && emitidoEm < usuario.senhaAlteradaEm.getTime()) {
      throw AppError.naoAutorizado('Sua senha foi alterada. Entre novamente.');
    }

    req.usuario = usuario;
    next();
  } catch (erro) {
    next(erro);
  }
}
