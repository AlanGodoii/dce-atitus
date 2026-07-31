import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_URL, api, errosPorCampo, mensagemDeErro } from '../services/api';
import LogoDce from '../components/LogoDce';
import PainelMarca from '../components/PainelMarca';
import IconeGoogle from '../components/IconeGoogle';
import './Auth.css';

export default function Cadastro() {
  const { cadastrar, autenticado, usuario } = useAuth();
  const navegar = useNavigate();

  const [form, setForm] = useState({ nome: '', email: '', senha: '', whatsapp: '' });
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState({});
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
    navegar(usuario?.emailVerificado ? '/perfil' : '/verificar-email', { replace: true });
  }, [autenticado, usuario?.emailVerificado, navegar]);

  function alterar(campo) {
    return (e) => {
      setForm((atual) => ({ ...atual, [campo]: e.target.value }));
      setErros((atual) => ({ ...atual, [campo]: undefined }));
    };
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setErros({});
    setEnviando(true);
    try {
      await cadastrar({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        whatsapp: form.whatsapp || undefined,
      });
      navegar(`/verificar-email?email=${encodeURIComponent(form.email)}`, { replace: true });
    } catch (e) {
      setErros(errosPorCampo(e));
      setErro(mensagemDeErro(e, 'Não foi possível criar a conta.'));
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

          <h1 className="auth__titulo">Criar conta</h1>
          <p className="auth__sub">Pode ser qualquer e-mail — não precisa ser o institucional.</p>

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
              <label htmlFor="nome">
                Nome completo <span className="obrigatorio">*</span>
              </label>
              <input
                id="nome"
                autoComplete="name"
                placeholder="Como no seu documento"
                value={form.nome}
                onChange={alterar('nome')}
                aria-invalid={Boolean(erros.nome)}
                required
              />
              {erros.nome ? <p className="erro">{erros.nome}</p> : null}
            </div>

            <div className="campo">
              <label htmlFor="email">
                E-mail <span className="obrigatorio">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@exemplo.com"
                value={form.email}
                onChange={alterar('email')}
                aria-invalid={Boolean(erros.email)}
                required
              />
              {erros.email ? <p className="erro">{erros.email}</p> : null}
            </div>

            <div className="campo">
              <label htmlFor="senha">
                Senha <span className="obrigatorio">*</span>
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={form.senha}
                onChange={alterar('senha')}
                aria-invalid={Boolean(erros.senha)}
                required
              />
              {erros.senha ? (
                <p className="erro">{erros.senha}</p>
              ) : (
                <p className="ajuda">Pelo menos 8 caracteres, com letras e números.</p>
              )}
            </div>

            <div className="campo">
              <label htmlFor="whatsapp">WhatsApp</label>
              <input
                id="whatsapp"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(54) 99999-9999"
                value={form.whatsapp}
                onChange={alterar('whatsapp')}
                aria-invalid={Boolean(erros.whatsapp)}
              />
              {erros.whatsapp ? (
                <p className="erro">{erros.whatsapp}</p>
              ) : (
                <p className="ajuda">É por onde o DCE fala com você sobre o pagamento.</p>
              )}
            </div>

            <button type="submit" className="btn btn-escuro btn-bloco" disabled={enviando}>
              {enviando ? <span className="spinner spinner-sm" /> : null}
              {enviando ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="auth__rodape">
            Já tem conta? <Link to="/login">Entrar</Link>
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
