// Script de apoio: renderiza uma carteirinha de exemplo para conferir o layout.
//   node preview-carteirinha.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { htmlFrente, htmlVerso, DIMENSOES } from './src/services/carteirinha-template.js';
import { gerarQrCodeDataUrl } from './src/services/qrcode.service.js';
import { calcularValidade } from './src/services/carteirinha.service.js';
import { obterNavegador, fecharNavegador } from './src/services/navegador.js';

const SAIDA = path.resolve('tmp/preview');
await fs.mkdir(SAIDA, { recursive: true });

// Foto de exemplo (retangulo neutro) so para ocupar a caixa 3x4.
const fotoExemplo = await sharp({
  create: { width: 600, height: 800, channels: 3, background: { r: 205, g: 210, b: 208 } },
})
  .jpeg()
  .toBuffer();

const dados = {
  nome: 'Livia Maria de Oliveira',
  cpf: '12345678900',
  dataNascimento: new Date('2002-11-10T00:00:00Z'),
  matricula: '2023014567',
  curso: 'Arquitetura e Urbanismo',
  nivel: 'graduacao',
  documentoTipo: 'rg',
  documentoNumero: '1234567890',
  documentoEmissor: 'SSP/RS',
  codigoUso: '7QK-M4FDA',
  fotoBase64: `data:image/jpeg;base64,${fotoExemplo.toString('base64')}`,
  qrDataUrl: await gerarQrCodeDataUrl('11111111-2222-3333-4444-555555555555'),
  dataEmissao: new Date('2026-07-29T00:00:00Z'),
  dataValidade: calcularValidade(new Date('2026-07-29T00:00:00Z')),
};

const navegador = await obterNavegador();

async function render(html, arquivo) {
  const pagina = await navegador.newPage();
  await pagina.setViewport({ ...{ width: DIMENSOES.largura, height: DIMENSOES.altura }, deviceScaleFactor: 1 });
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: path.join(SAIDA, arquivo), type: 'png', omitBackground: true });
  await pagina.close();
  console.log(`  ${arquivo}`);
}

await render(htmlFrente(dados), 'frente.png');
await render(htmlFrente({ ...dados, qrDataUrl: null, codigoUso: null }), 'frente-sem-qr.png');
await render(htmlVerso(dados), 'verso.png');

// Nome longo é o caso que mais quebra layout de carteirinha.
await render(
  htmlFrente({ ...dados, nome: 'Maria Eduarda Gonçalves de Albuquerque Santos', curso: 'Engenharia de Controle e Automação' }),
  'frente-nome-longo.png',
);

// Empilha frente + verso numa imagem só, para comparar com o mockup.
const [f, v] = await Promise.all([
  fs.readFile(path.join(SAIDA, 'frente.png')),
  fs.readFile(path.join(SAIDA, 'verso.png')),
]);
await sharp({
  create: {
    width: DIMENSOES.largura + 80,
    height: DIMENSOES.altura * 2 + 120,
    channels: 4,
    background: { r: 247, g: 248, b: 247, alpha: 1 },
  },
})
  .composite([
    { input: f, top: 40, left: 40 },
    { input: v, top: DIMENSOES.altura + 80, left: 40 },
  ])
  .png()
  .toFile(path.join(SAIDA, 'comparativo.png'));
console.log('  comparativo.png');

await fecharNavegador();
console.log(`\npreviews em ${SAIDA}`);
