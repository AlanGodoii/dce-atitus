import fs from 'node:fs';
import path from 'node:path';
import { CAMINHOS } from '../config/storage.js';
import { env } from '../config/env.js';
import { ROTULO_DOCUMENTO, ROTULO_NIVEL } from '../validators/perfil.validator.js';
import {
  formatarCnpj,
  formatarCpf,
  formatarDataBr,
  formatarTelefoneExibicao,
} from '../utils/validadores.js';

// Cartao no padrao ISO/IEC 7810 ID-1 (85,6 x 54 mm) a 300 dpi.
export const DIMENSOES = { largura: 1011, altura: 638 };

// Arte aprovada pelo DCE: frente clara com faixas verdes nos rotulos, verso
// verde profundo. O tracado em "S" ao fundo e o mesmo elemento das duas faces.
const PALETA = {
  verde: '#0F5C39',
  verdeEscuro: '#135036',
  claro: '#E4E6E3',
  tracoClaro: '#D5D9D4',
  tracoEscuro: '#1B6044',
  tinta: '#1F2421',
  fotoFundo: '#221F1F',
  branco: '#FFFFFF',
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

const escaparHtml = (valor) =>
  String(valor ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/**
 * O wordmark muda de cor entre as faces: verde sobre a frente clara, branco
 * sobre o verso. Se o DCE colocar a arte oficial em src/assets, ela e usada —
 * logo-dce-verde.png na frente, logo-dce-branco.png no verso.
 */
function logo(escala = 1, cor = PALETA.verde) {
  const arquivo = cor === PALETA.branco ? 'logo-dce-branco.png' : 'logo-dce-verde.png';
  const b64 = lerBase64(arquivo);
  if (b64) {
    return `<img class="logo-img" style="height:${58 * escala}px" src="data:image/png;base64,${b64}" alt="DCE ATITUS" />`;
  }
  return `
    <div class="logo" style="--escala:${escala};--cor:${cor}">
      <div class="logo-dce">DCE</div>
      <div class="logo-regua"></div>
      <div class="logo-atitus">ATITUS</div>
    </div>`;
}

// --- ornamento -------------------------------------------------------------

/** O "S" que atravessa o fundo nas duas faces. */
function swoosh(cor) {
  return `
  <svg class="swoosh" viewBox="0 0 560 700" preserveAspectRatio="xMidYMid slice">
    <path d="M446 -70 C250 60, 205 236, 372 322 C548 412, 512 556, 300 660 C214 702, 176 742, 172 800"
          fill="none" stroke="${cor}" stroke-width="30" stroke-linecap="round"/>
  </svg>`;
}

// --- CSS --------------------------------------------------------------------

function estilos() {
  return `
  ${FONTES}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${DIMENSOES.largura}px;height:${DIMENSOES.altura}px;background:transparent;}
  body{font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}

  .cartao{
    position:relative;width:${DIMENSOES.largura}px;height:${DIMENSOES.altura}px;
    border-radius:26px;overflow:hidden;
  }
  .cartao.frente{background:${PALETA.claro};color:${PALETA.tinta};}
  .cartao.verso{background:${PALETA.verdeEscuro};color:${PALETA.branco};}

  .swoosh{
    position:absolute;top:0;right:-60px;width:620px;height:100%;
    pointer-events:none;
  }

  /* ---- logo em CSS (fallback da arte oficial) ---- */
  .logo{display:inline-block;line-height:1;color:var(--cor);}
  .logo-dce{
    font-family:'Montserrat','Arial Black',sans-serif;font-weight:800;
    font-size:calc(58px * var(--escala));letter-spacing:-0.02em;
  }
  .logo-regua{
    height:calc(4px * var(--escala));background:var(--cor);
    margin:calc(6px * var(--escala)) 0 calc(5px * var(--escala));
  }
  .logo-atitus{
    font-family:'Montserrat','Arial Black',sans-serif;font-weight:800;
    font-size:calc(21px * var(--escala));letter-spacing:0.30em;
    text-align:center;text-indent:0.30em;
  }

  /* =================== FRENTE =================== */
  /* Centralizado na largura inteira do cartao, como na arte aprovada. Nao
     colide com o painel branco, que so comeca em 72%. */
  .frente-logo{position:absolute;top:26px;left:0;width:100%;text-align:center;z-index:3;}

  .frente-corpo{
    position:absolute;top:188px;left:56px;right:300px;bottom:30px;z-index:2;
  }
  .nome{
    font-size:33px;font-weight:600;color:${PALETA.verde};
    text-transform:uppercase;letter-spacing:0.01em;line-height:1.12;
    margin-bottom:18px;overflow-wrap:break-word;
  }
  .nome.longo{font-size:27px;}
  .nome.muito-longo{font-size:23px;}

  .frente-linha{display:flex;gap:26px;align-items:flex-start;}
  .foto{
    width:226px;height:287px;flex-shrink:0;
    background:${PALETA.fotoFundo};object-fit:cover;
  }
  .foto-vazia{
    display:flex;align-items:center;justify-content:center;
    color:#8f918e;font-size:16px;text-align:center;padding:14px;
  }

  .campos{flex:1;min-width:0;display:flex;flex-direction:column;gap:15px;}
  .campo{display:flex;align-items:baseline;gap:9px;min-width:0;}
  .chip{
    background:${PALETA.verde};color:${PALETA.branco};
    font-size:13.5px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;
    padding:4px 10px;white-space:nowrap;flex-shrink:0;
  }
  .valor{
    font-size:18px;font-weight:600;color:${PALETA.tinta};
    line-height:1.25;overflow-wrap:break-word;min-width:0;
  }

  /* ---- painel branco da direita ---- */
  .painel{
    position:absolute;top:44px;right:38px;bottom:0;width:250px;z-index:3;
    background:${PALETA.branco};border-radius:125px 125px 0 0;
    display:flex;flex-direction:column;align-items:center;
    padding:34px 20px 30px;
  }
  /* As margens automaticas centralizam o QR no espaco que sobra entre o topo
     do painel e o bloco do ano — o pedido foi "mais para baixo, no meio". */
  .painel-qr{margin:auto 0;display:flex;flex-direction:column;align-items:center;}
  .area-qr{width:190px;height:190px;display:flex;align-items:center;justify-content:center;}
  .area-qr img{width:100%;height:100%;display:block;}
  .area-qr.pendente{
    border:3px dashed #b9c2bc;color:#8e9a93;border-radius:12px;
    font-size:14px;text-align:center;padding:18px;line-height:1.4;
  }
  .codigo-rotulo{
    margin-top:14px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;
    color:#6d7a72;text-align:center;
  }
  .codigo-valor{
    font-size:21px;font-weight:700;color:${PALETA.verde};letter-spacing:0.04em;
    font-variant-numeric:tabular-nums;text-align:center;line-height:1.15;
  }
  .painel-ano{text-align:right;width:100%;line-height:1;}
  .painel-ano .inst{
    font-size:30px;font-weight:400;color:${PALETA.verde};letter-spacing:0.02em;
  }
  .painel-ano .ano{
    font-size:40px;font-weight:700;color:${PALETA.verde};letter-spacing:0.01em;
  }

  /* =================== VERSO =================== */
  .verso-conteudo{position:relative;z-index:2;height:100%;padding:34px 44px 0;
    display:flex;flex-direction:column;}
  .selo{
    align-self:center;border:2px solid rgba(255,255,255,0.75);
    padding:11px 30px;font-size:21px;letter-spacing:0.04em;
    text-transform:uppercase;color:#eef3f0;
  }
  .selo strong{font-weight:700;color:${PALETA.branco};}

  .verso-meio{display:flex;gap:34px;flex:1;margin-top:24px;min-height:0;}
  .verso-texto{flex:1.25;min-width:0;}
  .verso-texto p{font-size:18.5px;line-height:1.55;color:#e9efec;margin-bottom:14px;}
  .verso-texto strong{font-weight:700;color:${PALETA.branco};}

  .validade-box{
    display:inline-flex;align-items:baseline;gap:13px;
    border:2px solid rgba(255,255,255,0.6);padding:9px 20px;
  }
  .validade-box .rot{
    font-size:14px;letter-spacing:0.13em;text-transform:uppercase;
    color:rgba(255,255,255,0.8);
  }
  .validade-box strong{font-size:27px;font-weight:700;font-variant-numeric:tabular-nums;}

  /* Sem bloco de assinatura: o conteudo centraliza na altura do proprio
     espaco, em vez de ficar preso no topo com vazio embaixo. */
  .verso-emissor{
    flex:1;min-width:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;padding-bottom:22px;
  }
  .verso-emissor .logo,.verso-emissor .logo-img{margin-bottom:18px;}
  .emissor-linha{font-size:17px;line-height:1.55;color:#e9efec;align-self:stretch;text-align:center;}
  .emissor-linha strong{font-weight:700;color:${PALETA.branco};}

  .barra{
    background:rgba(0,0,0,0.22);margin:0 -44px;padding:15px 44px;
    display:flex;align-items:center;justify-content:space-between;gap:16px;
  }
  .barra-item{display:flex;align-items:center;gap:10px;font-size:16px;color:#e9efec;min-width:0;}
  .barra-item svg{flex-shrink:0;}
  .barra-sep{width:2px;height:21px;background:rgba(255,255,255,0.3);flex-shrink:0;}
  .barra-texto{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  `;
}

// --- icones -----------------------------------------------------------------

const icone = {
  globo: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>`,
  email: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 6l9 7 9-7"/></svg>`,
  telefone: `<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#7fd4b0" stroke-width="1.9"><path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 006 6l1.5-2L21 14.5v3a2 2 0 01-2.2 2A17.5 17.5 0 014 6.2 2 2 0 016 4z"/></svg>`,
};

// --- montagem ---------------------------------------------------------------

function classeNome(nome) {
  if (nome.length > 34) return 'nome muito-longo';
  if (nome.length > 24) return 'nome longo';
  return 'nome';
}

const campo = (rotulo, valor) =>
  `<div class="campo"><span class="chip">${rotulo}:</span><span class="valor">${valor}</span></div>`;

/**
 * Documento de identidade, que o Padrao Nacional da CIE exige em campo
 * separado do CPF — a arte original trazia os dois juntos em "CPF/CIN".
 * Sai vazio para os perfis cadastrados antes desta exigencia: melhor uma
 * linha a menos do que um rotulo apontando para o nada.
 */
function campoDocumento(dados) {
  if (!dados.documentoNumero) return '';
  const rotulo = ROTULO_DOCUMENTO[dados.documentoTipo] ?? 'Documento';
  const emissor = dados.documentoEmissor ? ` ${escaparHtml(dados.documentoEmissor)}` : '';
  return campo(escaparHtml(rotulo), `${escaparHtml(dados.documentoNumero)}${emissor}`);
}

/**
 * @param {object} dados
 * @param {string} dados.nome
 * @param {string} dados.cpf            somente digitos
 * @param {Date}   dados.dataNascimento
 * @param {string} dados.matricula
 * @param {string} dados.curso
 * @param {string} dados.nivel          chave do enum NivelEnsino
 * @param {string|null} dados.documentoTipo
 * @param {string|null} dados.documentoNumero
 * @param {string|null} dados.documentoEmissor
 * @param {string|null} dados.codigoUso   nulo antes da aprovacao
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
    : `<div class="area-qr pendente">QR liberado ap&oacute;s a aprova&ccedil;&atilde;o</div>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estilos()}</style></head><body>
  <div class="cartao frente">
    ${swoosh(PALETA.tracoClaro)}
    <div class="frente-logo">${logo(0.86, PALETA.verde)}</div>

    <div class="frente-corpo">
      <div class="${classeNome(dados.nome)}">${nome}</div>
      <div class="frente-linha">
        ${foto}
        <div class="campos">
          ${campo('Institui&ccedil;&atilde;o', escaparHtml(env.dce.instituicao.toUpperCase()))}
          ${campo('Grau', escaparHtml(ROTULO_NIVEL[dados.nivel] ?? dados.nivel))}
          ${campo('Curso', escaparHtml(dados.curso.toUpperCase()))}
          ${campo('Data de nascimento', formatarDataBr(dados.dataNascimento))}
          ${campoDocumento(dados)}
          ${campo('CPF', formatarCpf(dados.cpf))}
          ${campo('Matr&iacute;cula', escaparHtml(dados.matricula))}
        </div>
      </div>
    </div>

    <div class="painel">
      <div class="painel-qr">
        ${qr}
        <div class="codigo-rotulo">C&oacute;d. de uso</div>
        <div class="codigo-valor">${escaparHtml(dados.codigoUso ?? '— — —')}</div>
      </div>
      <div class="painel-ano">
        <div class="inst">${escaparHtml(env.dce.instituicao.toUpperCase())}</div>
        <div class="ano">${new Date(dados.dataEmissao).getUTCFullYear()}</div>
      </div>
    </div>
  </div>
  </body></html>`;
}

/**
 * @param {object} dados
 * @param {Date} dados.dataValidade  impressa aqui, e nao na frente, porque o
 *   Padrao Nacional da CIE (item 1.b) exige a validade "no verso do cartao".
 */
export function htmlVerso(dados = {}) {
  const urlValidar = `${env.frontendUrl.replace(/^https?:\/\//, '')}/validar`;
  const cnpj = env.dce.chavePix ? formatarCnpj(env.dce.chavePix) : '--';
  const telefone = env.dce.whatsapp ? formatarTelefoneExibicao(env.dce.whatsapp) : '--';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${estilos()}</style></head><body>
  <div class="cartao verso">
    ${swoosh(PALETA.tracoEscuro)}

    <div class="verso-conteudo">
      <div class="selo">Documento v&aacute;lido para <strong>meia-entrada</strong></div>

      <div class="verso-meio">
        <div class="verso-texto">
          <p>
            Documento padronizado nacionalmente conforme a
            <strong>Lei n&ordm; 12.933/2013</strong>, que garante a meia-entrada em
            eventos art&iacute;stico-culturais e esportivos a estudantes
            matriculados em institui&ccedil;&otilde;es de ensino.
          </p>
          <p>
            O ${escaparHtml(env.dce.nome)} confirma a condi&ccedil;&atilde;o de estudante
            para a emiss&atilde;o deste documento, v&aacute;lido em todo o territ&oacute;rio nacional.
          </p>
          <div class="validade-box">
            <span class="rot">V&aacute;lida at&eacute;</span>
            <strong>${dados.dataValidade ? formatarDataBr(dados.dataValidade) : '31/03/----'}</strong>
          </div>
        </div>

        <div class="verso-emissor">
          ${logo(0.62, PALETA.branco)}
          <div class="emissor-linha"><strong>EMISSOR:</strong> ${escaparHtml(env.dce.nome)}</div>
          <div class="emissor-linha">CNPJ: ${cnpj}</div>
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
  </div>
  </body></html>`;
}
