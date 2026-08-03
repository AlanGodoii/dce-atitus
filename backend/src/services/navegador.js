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
    // Em produção usamos o Chromium do sistema (ver Dockerfile); em
    // desenvolvimento, o que o Puppeteer baixou. A variável decide.
    ...(process.env.PUPPETEER_EXECUTABLE_PATH
      ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
      : {}),
    args: [
      // Sem --no-sandbox o Chromium não sobe dentro de contêiner. É seguro aqui
      // porque só renderizamos HTML que nós mesmos geramos, nunca conteúdo
      // vindo de fora.
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // O /dev/shm padrão de contêiner tem 64 MB e o Chromium estoura isso ao
      // renderizar, morrendo no meio da geração da carteirinha.
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
