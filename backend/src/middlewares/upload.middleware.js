import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8 MB
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Guarda em memoria porque o sharp reprocessa a imagem logo em seguida; nada
 * do que o usuario enviou chega a tocar o disco no formato original.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_ACEITOS.includes(file.mimetype)) {
      return cb(new AppError('Envie uma imagem JPG, PNG ou WEBP.', 415));
    }
    return cb(null, true);
  },
});

/** Comprovante de matrícula: aceita PDF além de imagem, e arquivo maior. */
const uploadComprovanteMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const aceitos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!aceitos.includes(file.mimetype)) {
      return cb(new AppError('Envie o comprovante em PDF, JPG, PNG ou WEBP.', 415));
    }
    return cb(null, true);
  },
});

export function uploadComprovante(req, res, next) {
  uploadComprovanteMulter.single('comprovante')(req, res, (erro) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('O comprovante deve ter no máximo 10 MB.', 413));
      }
      if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Envie o arquivo no campo "comprovante".', 400));
      }
      return next(new AppError(`Falha no upload: ${erro.message}`, 400));
    }
    if (erro) return next(erro);
    if (!req.file) return next(new AppError('Nenhum arquivo foi enviado.', 400));
    return next();
  });
}

export function uploadFoto(req, res, next) {
  upload.single('foto')(req, res, (erro) => {
    if (erro instanceof multer.MulterError) {
      if (erro.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('A imagem deve ter no máximo 8 MB.', 413));
      }
      if (erro.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Envie o arquivo no campo "foto".', 400));
      }
      return next(new AppError(`Falha no upload: ${erro.message}`, 400));
    }
    if (erro) return next(erro);
    if (!req.file) return next(new AppError('Nenhuma imagem foi enviada.', 400));
    return next();
  });
}
