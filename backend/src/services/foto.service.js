import crypto from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import { CAMINHOS, caminhoParaUrl, garantirPastas } from '../config/storage.js';
import { AppError } from '../utils/AppError.js';

// Proporcao 3x4 (foto de documento). Renderizamos a carteirinha em 300 dpi, e
// esse tamanho cobre a caixa da foto com folga.
const LARGURA = 600;
const ALTURA = 800;

/**
 * Normaliza a foto enviada pelo aluno: valida que o arquivo e mesmo uma imagem,
 * corta no centro em 3x4 e grava um JPEG. Como sempre reencodamos, qualquer
 * payload escondido nos metadados do arquivo original e descartado junto.
 */
export async function processarFotoPerfil(buffer, perfilId) {
  let metadados;
  try {
    metadados = await sharp(buffer).metadata();
  } catch {
    throw new AppError('Não foi possível ler a imagem. Ela pode estar corrompida.', 400);
  }

  if (!metadados.width || !metadados.height) {
    throw new AppError('Arquivo enviado não é uma imagem válida.', 400);
  }

  if (metadados.width < 200 || metadados.height < 260) {
    throw new AppError(
      `Imagem muito pequena (${metadados.width}x${metadados.height}px). ` +
        'Envie uma foto com pelo menos 200x260 pixels.',
      400,
    );
  }

  garantirPastas();

  const nomeArquivo = `${perfilId}-${crypto.randomBytes(6).toString('hex')}.jpg`;
  const destino = path.join(CAMINHOS.fotos, nomeArquivo);

  await sharp(buffer)
    .rotate() // respeita o EXIF antes de descartar os metadados
    .resize(LARGURA, ALTURA, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(destino);

  return { caminho: destino, url: caminhoParaUrl(destino) };
}
