import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const raizBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Onde ficam os arquivos que o sistema gera. Em producao aponta para o volume
 * persistente (DADOS_DIR=/app/dados no Render); em desenvolvimento, para a
 * propria pasta do backend.
 *
 * As duas subpastas precisam ficar sob a MESMA raiz porque o volume e um so —
 * se `privado` ficasse fora dele, os comprovantes de matricula sumiriam a cada
 * deploy.
 */
const raizDados = process.env.DADOS_DIR
  ? path.resolve(process.env.DADOS_DIR)
  : raizBackend;

export const CAMINHOS = {
  raiz: raizBackend,
  uploads: path.join(raizDados, 'uploads'),
  fotos: path.join(raizDados, 'uploads', 'fotos'),
  carteirinhas: path.join(raizDados, 'uploads', 'carteirinhas'),
  assets: path.join(raizBackend, 'src', 'assets'),

  // Fora de uploads/ de proposito: uploads/ e servido estaticamente, e o
  // comprovante de matricula nao pode ser acessivel por quem tiver a URL.
  privado: path.join(raizDados, 'privado'),
  comprovantes: path.join(raizDados, 'privado', 'comprovantes'),
};

export function garantirPastas() {
  for (const dir of [
    CAMINHOS.uploads,
    CAMINHOS.fotos,
    CAMINHOS.carteirinhas,
    CAMINHOS.privado,
    CAMINHOS.comprovantes,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Resolve o caminho de um comprovante a partir do nome guardado no banco.
 * Recusa qualquer nome que tente escapar da pasta (../, caminho absoluto).
 */
export function caminhoComprovante(nomeArquivo) {
  if (!nomeArquivo) return null;
  const seguro = path.basename(String(nomeArquivo));
  if (seguro !== nomeArquivo) return null;
  const completo = path.join(CAMINHOS.comprovantes, seguro);
  return completo.startsWith(CAMINHOS.comprovantes) ? completo : null;
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
