import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CAMINHOS, garantirPastas } from '../config/storage.js';
import { AppError } from '../utils/AppError.js';

/** Tipos que o aluno pode mandar. PDF porque a maioria dos portais exporta assim. */
export const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const ASSINATURA_PDF = Buffer.from('%PDF-');

/**
 * Confere o conteúdo real do arquivo, não o que o navegador declarou. Um
 * executável renomeado para .pdf não passa daqui.
 */
async function detectarTipo(buffer) {
  if (buffer.subarray(0, 5).equals(ASSINATURA_PDF)) {
    return { tipo: 'application/pdf', extensao: 'pdf' };
  }

  try {
    const meta = await sharp(buffer).metadata();
    if (meta.format === 'jpeg') return { tipo: 'image/jpeg', extensao: 'jpg' };
    if (meta.format === 'png') return { tipo: 'image/png', extensao: 'png' };
    if (meta.format === 'webp') return { tipo: 'image/webp', extensao: 'webp' };
  } catch {
    /* não é imagem que o sharp entenda */
  }

  return null;
}

/**
 * Grava o comprovante na pasta privada e devolve o nome do arquivo.
 * Imagens são reencodadas (descarta metadados); PDFs vão como vieram, porque
 * reescrever um PDF sem uma biblioteca dedicada arrisca corromper o documento.
 */
export async function salvarComprovante(buffer, perfilId) {
  const detectado = await detectarTipo(buffer);

  if (!detectado) {
    throw new AppError(
      'Arquivo não reconhecido. Envie o comprovante em PDF, JPG, PNG ou WEBP.',
      415,
    );
  }

  garantirPastas();

  const nomeArquivo = `${perfilId}-${crypto.randomBytes(8).toString('hex')}.${detectado.extensao}`;
  const destino = path.join(CAMINHOS.comprovantes, nomeArquivo);

  if (detectado.tipo === 'application/pdf') {
    await fs.writeFile(destino, buffer);
  } else {
    await sharp(buffer)
      .rotate()
      .resize(2000, 2600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(destino.replace(/\.\w+$/, '.jpg'));

    return { arquivo: nomeArquivo.replace(/\.\w+$/, '.jpg'), tipo: 'image/jpeg' };
  }

  return { arquivo: nomeArquivo, tipo: detectado.tipo };
}

export async function removerComprovante(nomeArquivo) {
  if (!nomeArquivo) return;
  const alvo = path.join(CAMINHOS.comprovantes, path.basename(nomeArquivo));
  await fs.unlink(alvo).catch(() => {});
}
