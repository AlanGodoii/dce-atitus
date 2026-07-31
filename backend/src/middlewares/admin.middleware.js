import { AppError } from '../utils/AppError.js';

/** Deve ser usado sempre depois de requireAuth. */
export function requireAdmin(req, _res, next) {
  if (!req.usuario) return next(AppError.naoAutorizado());
  if (req.usuario.role !== 'admin') {
    return next(AppError.proibido('Área restrita a administradores do DCE.'));
  }
  return next();
}
