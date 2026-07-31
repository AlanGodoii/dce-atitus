import dns from 'node:dns/promises';

const cacheDominios = new Map();
const TTL_CACHE_MS = 1000 * 60 * 60; // 1h

/**
 * Verifica se o dominio do e-mail realmente aceita correspondencia (registro MX,
 * com fallback para A/AAAA). Nao garante que a caixa exista, mas barra erros de
 * digitacao como "@gmial.com" no momento do cadastro.
 */
export async function dominioAceitaEmail(email) {
  const dominio = String(email).split('@')[1]?.toLowerCase();
  if (!dominio) return false;

  const cacheado = cacheDominios.get(dominio);
  if (cacheado && Date.now() - cacheado.em < TTL_CACHE_MS) {
    return cacheado.valido;
  }

  let valido = false;
  try {
    const registros = await dns.resolveMx(dominio);
    valido = registros.length > 0;
  } catch {
    try {
      await dns.lookup(dominio);
      valido = true;
    } catch {
      valido = false;
    }
  }

  cacheDominios.set(dominio, { valido, em: Date.now() });
  return valido;
}

export function normalizarEmail(email) {
  return String(email).trim().toLowerCase();
}
