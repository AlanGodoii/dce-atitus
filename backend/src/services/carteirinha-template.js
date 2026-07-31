import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS } from '../config/storage.js';
import { env } from '../config/env.js';
import { ROTULO_NIVEL } from '../validators/perfil.validator.js';
import {
  formatarCnpj,
  formatarCpf,
  formatarDataBr,
  formatarTelefoneExibicao,
} from '../utils/validadores.js';

// Cartao no padrao ISO/IEC 7810 ID-1 (85,6 x 54 mm) a 300 dpi.
export const DIMENSOES = { largura: 1011, altura: 638 };

const PALETA = {
  verde: '#0F3B31',
  verdeEscuro: '#0A2A23',
  grafite: '#2B2B2B',
  branco: '#FFFFFF',
  linha: 'rgba(255, 255, 255, 0.32)',
};

// --- assets embutidos -------------------------------------------------------

const cacheAssets = new Map();

function lerBase64(caminhoRelativo) {
  if (cacheAssets.has(caminhoRelativo)) return cacheAssets.get(caminhoRelativo);
  const completo = path.join(CAMINHOS.assets, caminhoRelativo);
  const valor = fs.existsSync(completo) ? fs.readFileSync(completo).toString('base64') : null;
  cacheAssets.set(caminhoRelativo, valor);
  return valor;
}

function fonteEmbutida(arquivo, familia, peso) {
  const b64 = lerBase64(path.join('fonts', arquivo));
  if (!b64) return '';
  return `@font-face{font-family:'${familia}';font-style:normal;font-weight:${peso};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

const FONTES = [
  fonteEmbutida('inter-400.woff2', 'Inter', 400),
  fonteEmbutida('inter-600.woff2', 'Inter', 600),
  fonteEmbutida('inter-700.woff2', 'Inter', 700),
  fonteEmbutida('montserrat-800.woff2', 'Montserrat', 800),
].join('');

/**
 * Se o DCE colocar a arte oficial em src/assets/logo-dce-branco.png, ela e usada.
 * Sem o arquivo, cai no wordmark em CSS, que reproduz o mesmo desenho.
 */
function logo(escala = 1) {
  const b64 = lerBase64('logo-dce-branco.png');
  if (b64) {
    return `<img class="logo-img" style="height:${58 * escala}px" src="data:image/png;base64,${b64}" alt="DCE ATITUS" />`;
  }
  return `
    <div class="logo" style="--escala:${escala}">
      <div class="logo-dce">DCE</div>
      <div class="logo-regua"></div>
      <div class="logo-atitus">ATITUS</div>
    </div>`;
}

/**
 * Bloco da assinatura do responsavel. Se existir src/assets/assinatura.png, a
 * arte escaneada e impressa acima da linha; sem o arquivo, sai so a linha com o
 * nome e o cargo, que continua sendo um documento valido.
 */
function blocoAssinatura() {
  const b64 = lerBase64('assinatura.png');
  const nome = env.dce.responsavelNome?.trim();

  return `
    <div class="assinatura">
      ${b64 ? `<img class="assinatura-img" src="data:image/png;base64,${b64}" alt="" />` : ''}
      <div class="assinatura-linha"></div>
      ${nome ? `<div class="assinatura-nome">${escaparHtml(nome.toUpperCase())}</div>` : ''}
      <div class="assinatura-cargo">${escaparHtml(env.dce.responsavelCargo)}</div>
    </div>`;
}

const escaparHtml = (valor) =>
  String(valor ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

// --- ornamentos geometricos -------------------------------------------------

const tracosTopo = `
  <svg class="tracos tracos-topo" viewBox="0 0 300 150" preserveAspectRatio="none">
    <path d="M40 -20 L300 130 M300 -20 L40 130 M170 -20 L300 55" stroke="${PALETA.linha}" stroke-width="2" fill="none"/>
  </svg>`;

const tracosRodape = `
  <svg class="tracos tracos-rodape" viewBox="0 0 340 110" preserveAspectRatio="none">
    <path d="M0 120 L110 10 L220 120 M120 120 L230 10 L340 120" stroke="${PALETA.linha}" stroke-width="2" fill="none"/>
  </svg>`;

const tracosVerso = `
  <svg class="tracos tracos-verso" viewBox="0 0 320 200" preserveAspectRatio="none">
    <path d="M0 0 L320 200 M320 0 L0 200" stroke="${PALETA.linha}" stroke-width="2" fill="none"/>
  </svg>`;

// --- CSS --------------------------------------------------------------------

function estilos() {
  return `
  ${FONTES}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${DIMENSOES.largura}px;height:${DIMENSOES.altura}px;background:transparent;}
  body{font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}

  .cartao{
    position:relative;width:${DIMENSOES.largura}px;height:${DIMENSOES.altura}px;
    background:${PALETA.verde};border-radius:34px;overflow:hidden;
    display:flex;flex-direction:column;color:${PALETA.branco};
  }
  .tracos{position:absolute;pointer-events:none;}
  .tracos-topo{top:0;right:0;width:300px;height:150px;}
  .tracos-rodape{bottom:0;right:60px;width:340px;height:110px;}
  .tracos-verso{top:0;right:0;width:320px;height:200px;}

  /* ---- logo em CSS (fallback da arte oficial) ---- */
  .logo{display:inline-block;line-height:1;}
  .logo-dce{
    font-family:'Montserrat','Arial Black',sans-serif;font-weight:800;
    font-size:calc(62px * var(--escala));letter-spacing:-0.02em;
  }
  .logo-regua{
    height:calc(4px * var(--escala));background:${PALETA.branco};
    margin:calc(7px * var(--escala)) 0 calc(5px * var(--escala));
  }
  .logo-atitus{
    font-family:'Montserrat','Arial Black',sans-serif;font-weight:800;
    font-size:calc(23px * var(--escala));letter-spacing:calc(0.30em);
    text-align:center;text-indent:calc(0.30em);
  }

  /* ---- frente: topo ---- */
  .topo{
    display:flex;align-items:center;justify-content:space-between;
    padding:26px 44px 22px;position:relative;z-index:2;
  }
  .titulo-doc{font-size:31px;font-weight:700;letter-spacing:-0.01em;}

  /* ---- frente: faixa central ---- */
  .miolo{
    flex:1;background:${PALETA.grafite};
    display:flex;align-items:center;gap:38px;padding:26px 44px;
  }
  .foto{
    width:222px;height:296px;flex-shrink:0;border-radius:12px;
    border:4px solid ${PALETA.branco};object-fit:cover;background:#d8dbd9;
  }
  .foto-vazia{
    display:flex;align-items:center;justify-content:center;
    color:#8b8f8d;font-size:17px;text-align:center;padding:14px;
  }
  .dados{flex:1;min-width:0;}
  .nome{
    font-size:33px;font-weight:700;letter-spacing:-0.01em;
    margin-bottom:19px;text-transform:uppercase;line-height:1.12;
    overflow-wrap:break-word;
  }
  .nome.longo{font-size:27px;}
  .nome.muito-longo{font-size:23px;}
  .campo{font-size:21px;line-height:1.62;color:#f2f4f3;}
  .campo strong{font-weight:700;color:${PALETA.branco};}
  .campo .rotulo{font-weight:400;}

  .area-qr{
    width:214px;height:214px;flex-shrink:0;border-radius:14px;
    display:flex;align-items:center;justify-content:center;
    background:${PALETA.branco};padding:9px;
  }
  .area-qr img{width:100%;height:100%;display:block;}
  .area-qr.pendente{
    background:transparent;border:3px dashed rgba(255,255,255,0.45);
    color:rgba(255,255,255,0.55);font-size:16px;text-align:center;padding:20px;line-height:1.4;
  }

  /* ---- frente: rodape ---- */
  .rodape{
    display:flex;align-items:center;gap:26px;
    padding:16px 44px 22px;position:relative;z-index:2;
  }
  .ano{font-size:53px;font-weight:700;letter-spacing:-0.02em;line-height:1;}
  .divisor{width:2px;height:38px;background:rgba(255,255,255,0.55);}
  .validade{font-size:22px;color:#e8ecea;}

  /* ---- verso ---- */
  .verso{padding:44px 46px 0;display:flex;gap:34px;flex:1;position:relative;z-index:2;}
  .verso-texto{flex:1.32;min-width:0;}
  .verso-titulo{font-size:38px;font-weight:700;margin-bottom:20px;letter-spacing:-0.01em;}
  .verso-texto p{font-size:20.5px;line-height:1.6;color:#eef1f0;margin-bottom:18px;}
  .verso-emissor{flex:1;padding-top:118px;min-width:0;}
  .emissor-linha{font-size:19px;line-height:1.62;color:#eef1f0;}
  .emissor-linha strong{font-weight:700;color:${PALETA.branco};}
  .assinatura{
    margin-top:15px;border:2px solid rgba(255,255,255,0.55);border-radius:12px;
    min-height:104px;display:flex;flex-direction:column;align-items:center;
    justify-content:flex-end;padding:10px 18px 12px;
  }
  .assinatura-img{
    max-height:52px;max-width:100%;object-fit:contain;margin-bottom:4px;
    /* A assinatura e escaneada em preto; invertemos para ela aparecer no verde. */
    filter:invert(1) brightness(2);
  }
  .assinatura-linha{width:100%;border-bottom:2px solid rgba(255,255,255,0.75);}
  .assinatura-nome{
    font-size:16px;font-weight:700;margin-top:7px;text-align:center;line-height:1.2;
  }
  .assinatura-cargo{
    font-size:13.5px;color:rgba(255,255,255,0.72);text-align:center;margin-top:2px;
  }
  .verso-logo{position:absolute;top:40px;right:46px;z-index:3;}

  .barra{
    background:${PALETA.verdeEscuro};padding:19px 46px;
    display:flex;align-items:center;justify-content:space-between;gap:18px;
    position:relative;z-index:2;
  }
  .barra-item{display:flex;align-items:center;gap:11px;font-size:18px;color:#e8ecea;min-width:0;}
  .barra-item svg{flex-shrink:0;}
  .barra-sep{width:2px;height:24px;background:rgba(255,255,255,0.3);flex-shrink:0;}
  .barra-texto{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  `;
}

// --- icones -----------------------------------------------------------------

const icone = {
  globo: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>`,
  email: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6l9 7 9-7"/></svg>`,
  telefone: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 006 6l1.5-2L21 14.5v3a2 2 0 01-2.2 2A17.5 17.5 0 014 6.2 2 2 0 016 4z"/></svg>`,
};

// --- montagem ---------------------------------------------------------------

function classeNome(nome) {
  if (nome.length > 34) return 'nome muito-longo';
  if (nome.length > 24) return 'nome longo';
  return 'nome';
}

/**
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.cpf            somente digitos
 * @param {Date}   dados.dataNascimento
 * @param {string} dados.matricula
 * @param {string} dados.curso
 * @param {string} dados.nivel          chave do enum NivelEnsino
 * @param {string|null} dados.fotoBase64  data URI da foto
 * @param {string|null} dados.qrDataUrl   data URI do QR (null antes da aprovacao)
 * @param {Date}   dados.dataEmissao
 * @param {Date}   dados.dataValidade
 */
export function htmlFrente(dados) {
  const nome = escaparHtml(dados.nome.toUpperCase());

  const foto = dados.fotoBase64
    ? `<img class="foto" src="${dados.fotoBase64}" alt="" />`
    : `<div class="foto foto-vazia">sem foto</div>`;

  const qr = dados.qrDataUrl
    ? `<div class="area-qr"><img src="${dados.qrDataUrl}" alt="QR de validacao" /></div>`
    : `<div class="area-qr pendente">QR liberado apos a aprovacao</div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estilos()}</style></head><body>
  <div class="cartao">
    ${tracosTopo}
    <div class="topo">
      ${logo(1)}
      <div class="titulo-doc">Carteira de Identifica&ccedil;&atilde;o Estudantil</div>
    </div>

    <div class="miolo">
      ${foto}
      <div class="dados">
        <div class="${classeNome(dados.nome)}">${nome}</div>
        <div class="campo"><span class="rotulo">CPF:</span> ${formatarCpf(dados.cpf)}</div>
        <div class="campo"><span class="rotulo">Data Nasc.:</span> ${formatarDataBr(dados.dataNascimento)}</div>
        <div class="campo"><span class="rotulo">Matr&iacute;cula:</span> ${escaparHtml(dados.matricula)}</div>
        <div class="campo"><span class="rotulo">Curso:</span> <strong>${escaparHtml(dados.curso.toUpperCase())}</strong></div>
        <div class="campo"><span class="rotulo">N&iacute;vel:</span> <strong>${escaparHtml(ROTULO_NIVEL[dados.nivel] ?? dados.nivel)}</strong></div>
        <div class="campo"><span class="rotulo">Institui&ccedil;&atilde;o:</span> <strong>${escaparHtml(env.dce.instituicao.toUpperCase())}</strong></div>
      </div>
      ${qr}
    </div>

    ${tracosRodape}
    <div class="rodape">
      <div class="ano">${new Date(dados.dataEmissao).getUTCFullYear()}</div>
      <div class="divisor"></div>
      <div class="validade">V&aacute;lida at&eacute; ${formatarDataBr(dados.dataValidade)}</div>
    </div>
  </div>
  </body></html>`;
}

export function htmlVerso() {
  const urlValidar = `${env.frontendUrl.replace(/^https?:\/\//, '')}/validar`;
  const cnpj = env.dce.chavePix ? formatarCnpj(env.dce.chavePix) : '--';
  const telefone = env.dce.whatsapp ? formatarTelefoneExibicao(env.dce.whatsapp) : '--';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estilos()}</style></head><body>
  <div class="cartao">
    ${tracosVerso}
    <div class="verso-logo">${logo(0.74)}</div>

    <div class="verso">
      <div class="verso-texto">
        <div class="verso-titulo">Base Legal</div>
        <p>
          Esta Carteira de Identifica&ccedil;&atilde;o Estudantil (CIE) &eacute; emitida pelo
          Diret&oacute;rio Central de Estudantes da ATITUS, atendendo &agrave;
          Lei Federal n&ordm; 12.933/2013, art. 1&ordm;, &sect; 2&ordm;, que garante a
          meia-entrada em eventos art&iacute;stico-culturais e esportivos a
          estudantes matriculados em institui&ccedil;&otilde;es de ensino.
        </p>
        <p>
          O ${escaparHtml(env.dce.nome)} confirma a condi&ccedil;&atilde;o de estudante para
          a emiss&atilde;o deste documento.
        </p>
      </div>

      <div class="verso-emissor">
        <div class="emissor-linha"><strong>EMISSOR:</strong> ${escaparHtml(env.dce.nome)}</div>
        <div class="emissor-linha">CNPJ: ${cnpj}</div>
        <div class="emissor-linha">Respons&aacute;vel pela emiss&atilde;o</div>
        ${blocoAssinatura()}
      </div>
    </div>

    <div class="barra">
      <div class="barra-item">${icone.globo}<span class="barra-texto">Validar em: ${escaparHtml(urlValidar)}</span></div>
      <div class="barra-sep"></div>
      <div class="barra-item">${icone.email}<span class="barra-texto">${escaparHtml(env.dce.email || '--')}</span></div>
      <div class="barra-sep"></div>
      <div class="barra-item">${icone.telefone}<span class="barra-texto">${telefone}</span></div>
    </div>
  </div>
  </body></html>`;
}
