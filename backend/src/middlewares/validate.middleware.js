import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

/**
 * Valida e substitui req[origem] pelo dado ja parseado/normalizado pelo Zod.
 * Erros viram 422 com a lista de campos, no formato consumido pelo frontend.
 */
export function validate(schema, origem = 'body') {
  return async (req, _res, next) => {
    try {
      req[origem] = await schema.parseAsync(req[origem]);
      next();
    } catch (erro) {
      if (erro instanceof ZodError) {
        const detalhes = erro.issues.map((issue) => ({
          campo: issue.path.join('.') || origem,
          mensagem: issue.message,
        }));
        return next(new AppError('Dados inválidos.', 422, detalhes));
      }
      next(erro);
    }
  };
}
