import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, registrarHandlerDeSessao, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfilCompleto, setPerfilCompleto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const sair = useCallback(() => {
    tokenStorage.limpar();
    setUsuario(null);
    setPerfilCompleto(false);
  }, []);

  const carregarSessao = useCallback(async () => {
    if (!tokenStorage.ler()) {
      setUsuario(null);
      setCarregando(false);
      return null;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUsuario(data.usuario);
      setPerfilCompleto(data.perfilCompleto);
      return data.usuario;
    } catch {
      // 401 já limpa o token no interceptor; aqui só refletimos no estado.
      setUsuario(null);
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    registrarHandlerDeSessao(() => {
      setUsuario(null);
      setPerfilCompleto(false);
    });
    carregarSessao();
  }, [carregarSessao]);

  const entrarComToken = useCallback(
    async (token) => {
      tokenStorage.salvar(token);
      setCarregando(true);
      return carregarSessao();
    },
    [carregarSessao],
  );

  const login = useCallback(
    async (email, senha) => {
      const { data } = await api.post('/auth/login', { email, senha });
      return entrarComToken(data.token);
    },
    [entrarComToken],
  );

  const cadastrar = useCallback(
    async (dados) => {
      const { data } = await api.post('/auth/register', dados);
      return entrarComToken(data.token);
    },
    [entrarComToken],
  );

  const valor = useMemo(
    () => ({
      usuario,
      perfilCompleto,
      setPerfilCompleto,
      carregando,
      autenticado: Boolean(usuario),
      ehAdmin: usuario?.role === 'admin',
      login,
      cadastrar,
      entrarComToken,
      recarregar: carregarSessao,
      sair,
    }),
    [usuario, perfilCompleto, carregando, login, cadastrar, entrarComToken, carregarSessao, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return contexto;
}
