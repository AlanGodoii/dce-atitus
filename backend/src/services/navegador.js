import puppeteer from 'puppeteer';

let navegadorPromise = null;

/**
 * Uma unica instancia do Chromium para todo o processo. Subir o navegador custa
 * ~1s; como a aprovacao de pagamento pode vir em lote, vale manter aberto.
 */
export async function obterNavegador() {
  if (navegadorPromise) {
    const navegador = await navegadorPromise;
    if (navegador.connected) return navegador;
    navegadorPromise = null; // caiu: sobe outro
  }

  navegadorPromise = puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  });

  return navegadorPromise;
}

export async function fecharNavegador() {
  if (!navegadorPromise) return;
  const navegador = await navegadorPromise.catch(() => null);
  navegadorPromise = null;
  await navegador?.close().catch(() => {});
}
