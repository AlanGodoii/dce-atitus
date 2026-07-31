import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

/**
 * Barra ações que dependem de o e-mail ser real. Usado antes de o aluno entrar
 * na fila do DCE: dali em diante alguém gasta tempo conferindo comprovante e a
 * carteirinha é entregue por e-mail — não dá para isso cair no vazio.
 *
 * Deve vir depois de requireAuth.
 */
export async function requireEmailVerificado(req, _res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      select: { emailVerificadoEm: true, email: true },
    });

    if (!usuario?.emailVerificadoEm) {
      throw new AppError(
        `Confirme o seu e-mail antes de continuar. Enviamos um link para ${usuario?.email}.`,
        403,
        { motivo: 'email_nao_verificado' },
      );
    }

    next();
  } catch (erro) {
    next(erro);
  }
}
