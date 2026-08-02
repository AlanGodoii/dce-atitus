import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, api, mensagemDeErro } from '../services/api';
import LogoDce from '../components/LogoDce';
import PainelMarca from '../components/PainelMarca';
import IconeGoogle from '../components/IconeGoogle';
import './Auth.css';

export default function Login() {
  const { login, autenticado, ehAdmin } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [params] = useSearchParams();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(params.get('erro') ?? '');
  const [enviando, setEnviando] = useState(false);
  const [googleHabilitado, setGoogleHabilitado] = useState(false);

  useEffect(() => {
    api
      .get('/config-publica')
      .then(({ data }) => setGoogleHabilitado(data.loginGoogleHabilitado))
      .catch(() => setGoogleHabilitado(false));
  }, []);

  useEffect(() => {
    if (!autenticado) return;

    const padrao = ehAdmin ? '/admin/pagamentos' : '/carteirinha';
    const tentada = local.state?.de;

    // Só devolve para a rota que o usuário tentou se ela combinar com o papel
    // dele. Sem isso, um admin barrado em /carteirinha voltava para a área do
    // estudante — onde não tem perfil e via "complete seu cadastro".
    const combina = typeof tentada === 'string' && tentada.startsWith('/admin') === ehAdmin;

    navegar(combina ? tentada : padrao, { replace: true });
  }, [autenticado, ehAdmin, local.state, navegar]);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await login(email, senha);
      // O efeito acima cuida do redirecionamento assim que a sessão carrega.
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar.'));
      setEnviando(false);
    }
  }

  return (
    <div className="auth">
      <PainelMarca />

      <div className="auth__painel">
        <div className="auth__caixa">
          <div className="auth__logo-mobile">
            <LogoDce cor="verde" escala={0.7} />
          </div>

          <h1 className="auth__titulo">Entrar</h1>
          <p className="auth__sub">Acesse a sua área do estudante do DCE ATITUS.</p>

          {erro ? (
            <div className="aviso aviso-erro" role="alert">
              {erro}
            </div>
          ) : null}

          {googleHabilitado ? (
            <>
              <a className="auth__google" href={`${API_URL}/auth/google`}>
                <IconeGoogle />
                Continuar com Google
              </a>
              <div className="auth__ou">OU</div>
            </>
          ) : null}

          <form onSubmit={enviar} noValidate>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="campo">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <label htmlFor="senha">Senha</label>
                <Link
                  to={`/esqueci-senha${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  style={{ fontSize: 13, color: 'var(--verde-700)', fontWeight: 600 }}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-escuro btn-bloco" disabled={enviando}>
              {enviando ? <span className="spinner spinner-sm" /> : null}
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="auth__rodape">
            Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
          </p>

          <Link to="/" className="auth__voltar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H6M12 5.5L5.5 12l6.5 6.5" />
            </svg>
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
