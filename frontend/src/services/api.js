import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

const CHAVE_TOKEN = 'dce_atitus_token';

export const tokenStorage = {
  ler: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (token) => localStorage.setItem(CHAVE_TOKEN, token),
  limpar: () => localStorage.removeItem(CHAVE_TOKEN),
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = tokenStorage.ler();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Chamado pelo AuthContext para derrubar a sessão quando a API recusa o token.
let aoExpirarSessao = () => {};
export function registrarHandlerDeSessao(handler) {
  aoExpirarSessao = handler;
}

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const status = erro.response?.status;
    // 403 não desloga: é falta de permissão, não sessão inválida.
    if (status === 401 && tokenStorage.ler()) {
      tokenStorage.limpar();
      aoExpirarSessao();
    }
    return Promise.reject(erro);
  },
);

/**
 * Extrai a mensagem que o backend mandou. A API responde { erro, detalhes[] };
 * quando há detalhes de validação, junta tudo numa frase só.
 */
export function mensagemDeErro(erro, padrao = 'Algo deu errado. Tente novamente.') {
  const dados = erro?.response?.data;
  if (!dados) {
    if (erro?.code === 'ERR_NETWORK') {
      return 'Não foi possível falar com o servidor. Verifique se a API está rodando.';
    }
    return padrao;
  }
  if (Array.isArray(dados.detalhes) && dados.detalhes.length > 0) {
    return dados.detalhes.map((d) => d.mensagem).join(' ');
  }
  return dados.erro ?? padrao;
}

/**
 * Abre um arquivo servido por rota autenticada (o axios manda o Bearer, mas
 * uma <a href> não mandaria). Busca como blob e abre numa aba nova.
 */
export async function abrirArquivoProtegido(caminho) {
  const { data } = await api.get(caminho, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  window.open(url, '_blank', 'noopener');
  // Revoga depois de dar tempo de a aba carregar.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Baixa um arquivo público (as imagens da carteirinha em /uploads) forçando o
 * salvamento, com o nome que a gente escolhe.
 *
 * Um `<a download>` simples NÃO resolve aqui: a API vive em outra origem que o
 * site, e o navegador ignora o atributo `download` em link cross-origin — abre
 * numa aba em vez de baixar. Buscar como blob traz o arquivo para a mesma
 * origem, e aí o download acontece de verdade.
 */
export async function baixarArquivo(url, nomeArquivo) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Não foi possível baixar (HTTP ${resposta.status}).`);

  const blob = await resposta.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

/** Mapa campo -> mensagem, para marcar o input exato que falhou. */
export function errosPorCampo(erro) {
  const detalhes = erro?.response?.data?.detalhes;
  if (!Array.isArray(detalhes)) return {};
  return detalhes.reduce((acc, d) => {
    if (!acc[d.campo]) acc[d.campo] = d.mensagem;
    return acc;
  }, {});
}
