import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars -- o Express so reconhece o handler de erro com 4 parametros
export function errorHandler(erro, req, res, _next) {
  if (erro instanceof AppError) {
    return res.status(erro.status).json({
      erro: erro.message,
      ...(erro.detalhes ? { detalhes: erro.detalhes } : {}),
    });
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = violacao de constraint unica
    if (erro.code === 'P2002') {
      const campo = erro.meta?.target?.[0] ?? 'campo';
      return res.status(409).json({ erro: `Já existe um registro com este ${campo}.` });
    }
    // P2025 = registro esperado nao encontrado
    if (erro.code === 'P2025') {
      return res.status(404).json({ erro: 'Registro não encontrado.' });
    }
  }

  if (erro?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }

  console.error('[erro nao tratado]', erro);

  return res.status(500).json({
    erro: 'Erro interno no servidor.',
    ...(env.isProd ? {} : { debug: erro.message }),
  });
}
