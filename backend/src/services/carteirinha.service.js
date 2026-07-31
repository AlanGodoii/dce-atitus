import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/prisma.js';
import { CAMINHOS, caminhoParaUrl, garantirPastas, urlParaCaminho } from '../config/storage.js';
import { obterNavegador } from './navegador.js';
import { DIMENSOES, htmlFrente, htmlVerso } from './carteirinha-template.js';
import { gerarQrCodeDataUrl } from './qrcode.service.js';

/**
 * Validade da CIE: 31 de marco do ano seguinte ao da emissao
 * (Lei 12.933/2013 e Decreto 8.537/2015).
 */
export function calcularValidade(dataEmissao = new Date()) {
  return new Date(Date.UTC(dataEmissao.getUTCFullYear() + 1, 2, 31));
}

async function fotoComoDataUri(fotoUrl) {
  const caminho = urlParaCaminho(fotoUrl);
  if (!caminho) return null;
  try {
    const buffer = await fs.readFile(caminho);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  } catch {
    // Foto sumiu do disco: o cartao ainda sai, com o espaco marcado como vazio.
    return null;
  }
}

async function renderizarPng(html, destino) {
  const navegador = await obterNavegador();
  const pagina = await navegador.newPage();
  try {
    await pagina.setViewport({
      width: DIMENSOES.largura,
      height: DIMENSOES.altura,
      deviceScaleFactor: 1,
    });
    await pagina.setContent(html, { waitUntil: 'load' });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: destino, type: 'png', omitBackground: true });
  } finally {
    await pagina.close().catch(() => {});
  }
}

async function renderizarPdf(htmlA, htmlB, destino) {
  const navegador = await obterNavegador();
  const pagina = await navegador.newPage();
  try {
    // Uma pagina A4 com as duas faces empilhadas, pronta para imprimir e recortar.
    const documento = `<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:A4;margin:16mm;}
      *{margin:0;padding:0;box-sizing:border-box;}
      body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;gap:14mm;}
      .face{width:85.6mm;height:54mm;}
      .face img{width:100%;height:100%;display:block;border-radius:3mm;}
      .rotulo{font-size:9pt;color:#555;margin-bottom:2mm;letter-spacing:.08em;}
    </style></head><body>
      <div><div class="rotulo">FRENTE</div><div class="face">${htmlA}</div></div>
      <div><div class="rotulo">VERSO</div><div class="face">${htmlB}</div></div>
    </body></html>`;

    await pagina.setContent(documento, { waitUntil: 'load' });
    await pagina.pdf({ path: destino, format: 'A4', printBackground: true });
  } finally {
    await pagina.close().catch(() => {});
  }
}

/**
 * Renderiza frente, verso e PDF da carteirinha e devolve as URLs publicas.
 * Chamado na aprovacao do pagamento, quando o QR ja existe.
 */
export async function gerarArquivosCarteirinha({ carteirinha, perfil, usuario }) {
  garantirPastas();

  const [qrDataUrl, fotoBase64] = await Promise.all([
    gerarQrCodeDataUrl(carteirinha.qrCodeUuid),
    fotoComoDataUri(perfil.fotoUrl),
  ]);

  const dados = {
    nome: usuario.nome,
    cpf: perfil.cpf,
    dataNascimento: perfil.dataNascimento,
    matricula: perfil.matricula,
    curso: perfil.curso,
    nivel: perfil.nivel,
    fotoBase64,
    qrDataUrl,
    dataEmissao: carteirinha.dataEmissao ?? new Date(),
    dataValidade: carteirinha.dataValidade ?? calcularValidade(),
  };

  const base = `${carteirinha.id}`;
  const caminhoFrente = path.join(CAMINHOS.carteirinhas, `${base}-frente.png`);
  const caminhoVerso = path.join(CAMINHOS.carteirinhas, `${base}-verso.png`);
  const caminhoPdf = path.join(CAMINHOS.carteirinhas, `${base}.pdf`);

  const frente = htmlFrente(dados);
  const verso = htmlVerso();

  await renderizarPng(frente, caminhoFrente);
  await renderizarPng(verso, caminhoVerso);

  // O PDF reaproveita os PNGs ja gerados em vez de re-renderizar o HTML.
  const [b64Frente, b64Verso] = await Promise.all([
    fs.readFile(caminhoFrente).then((b) => b.toString('base64')),
    fs.readFile(caminhoVerso).then((b) => b.toString('base64')),
  ]);
  await renderizarPdf(
    `<img src="data:image/png;base64,${b64Frente}" alt="Frente da carteirinha" />`,
    `<img src="data:image/png;base64,${b64Verso}" alt="Verso da carteirinha" />`,
    caminhoPdf,
  );

  return {
    frenteUrl: caminhoParaUrl(caminhoFrente),
    versoUrl: caminhoParaUrl(caminhoVerso),
    pdfUrl: caminhoParaUrl(caminhoPdf),
    caminhos: { frente: caminhoFrente, verso: caminhoVerso, pdf: caminhoPdf },
  };
}

/**
 * Regera os arquivos de uma carteirinha ja emitida, mantendo o MESMO QR.
 *
 * Serve para dois casos: correcao de dados pelo DCE (o documento em circulacao
 * passa a divergir do banco) e troca do endereco publico do sistema (o QR antigo
 * aponta para um dominio que nao existe mais). Manter o uuid e essencial — se
 * mudasse, quem ja imprimiu ficaria com um codigo invalido.
 */
export async function reemitirCarteirinha(carteirinhaId) {
  const carteirinha = await prisma.carteirinha.findUnique({
    where: { id: carteirinhaId },
    include: { perfil: { include: { usuario: true } } },
  });

  if (!carteirinha) throw new Error('Carteirinha nao encontrada.');
  if (carteirinha.status !== 'aprovada') {
    throw new Error('So carteirinhas aprovadas podem ser reemitidas.');
  }

  const arquivos = await gerarArquivosCarteirinha({
    carteirinha,
    perfil: carteirinha.perfil,
    usuario: carteirinha.perfil.usuario,
  });

  await prisma.carteirinha.update({
    where: { id: carteirinha.id },
    data: { arquivoUrl: arquivos.frenteUrl, arquivoVersoUrl: arquivos.versoUrl },
  });

  return { carteirinha, arquivos, usuario: carteirinha.perfil.usuario };
}

/** Preview sem QR, usado na area do estudante antes da aprovacao. */
export async function gerarPreviaFrente(perfil, usuario) {
  const fotoBase64 = await fotoComoDataUri(perfil.fotoUrl);
  return htmlFrente({
    nome: usuario.nome,
    cpf: perfil.cpf,
    dataNascimento: perfil.dataNascimento,
    matricula: perfil.matricula,
    curso: perfil.curso,
    nivel: perfil.nivel,
    fotoBase64,
    qrDataUrl: null,
    dataEmissao: new Date(),
    dataValidade: calcularValidade(),
  });
}
