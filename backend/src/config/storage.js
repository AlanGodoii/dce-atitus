import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const CAMINHOS = {
  raiz: raizBackend,
  uploads: path.join(raizBackend, 'uploads'),
  fotos: path.join(raizBackend, 'uploads', 'fotos'),
  carteirinhas: path.join(raizBackend, 'uploads', 'carteirinhas'),
  assets: path.join(raizBackend, 'src', 'assets'),
};

export function garantirPastas() {
  for (const dir of [CAMINHOS.uploads, CAMINHOS.fotos, CAMINHOS.carteirinhas]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Converte um caminho absoluto em disco para a URL publica servida por /uploads. */
export function caminhoParaUrl(caminhoAbsoluto) {
  if (!caminhoAbsoluto) return null;
  const relativo = path.relative(CAMINHOS.uploads, caminhoAbsoluto).split(path.sep).join('/');
  return `${env.apiUrl}/uploads/${relativo}`;
}

/** Caminho de volta a partir da URL publica (usado para embutir a imagem no HTML). */
export function urlParaCaminho(url) {
  if (!url) return null;
  const marcador = '/uploads/';
  const i = url.indexOf(marcador);
  if (i === -1) return null;
  const relativo = url.slice(i + marcador.length);
  return path.join(CAMINHOS.uploads, ...relativo.split('/'));
}

export function removerArquivoSilencioso(caminho) {
  if (!caminho) return;
  fs.promises.unlink(caminho).catch(() => {});
}
