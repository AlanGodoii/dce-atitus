import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, mensagemDeErro } from '../services/api';
import LogoDce from '../components/LogoDce';
import PainelMarca from '../components/PainelMarca';
import './Auth.css';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [dev, setDev] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post('/auth/esqueci-senha', { email });
      setEnviado(true);
      // Só existe fora de produção, para testar sem depender da caixa de e-mail.
      setDev(data.dev ?? null);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar o e-mail.'));
    } finally {
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

          {enviado ? (
            <>
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  background: '#e8f6ee',
                  color: 'var(--verde-700)',
                  marginBottom: 20,
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
                  <path d="M3 6l9 7 9-7" />
                </svg>
              </div>

              <h1 className="auth__titulo">Confira seu e-mail</h1>
              <p className="auth__sub">
                Se houver uma conta com <strong>{email}</strong>, enviamos um link para criar uma
                senha nova. Ele vale por <strong>1 hora</strong>.
              </p>

              {dev ? (
                <div className="aviso aviso-info">
                  <span>
                    <strong>Ambiente de desenvolvimento.</strong> Código: <strong>{dev.codigo}</strong>
                    <br />
                    <Link to={dev.link.replace(/^https?:\/\/[^/]+/, '')} style={{ textDecoration: 'underline' }}>
                      Abrir o link de redefinição
                    </Link>
                  </span>
                </div>
              ) : null}

              <p className="ajuda">
                Não chegou? Verifique a caixa de spam. O e-mail pode levar alguns minutos.
              </p>

              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <Link to="/redefinir-senha" className="btn btn-primario btn-sm">
                  Já tenho o código
                </Link>
                <button
                  type="button"
                  className="btn btn-contorno btn-sm"
                  onClick={() => setEnviado(false)}
                >
                  Usar outro e-mail
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="auth__titulo">Esqueci minha senha</h1>
              <p className="auth__sub">
                Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.
              </p>

              {erro ? (
                <div className="aviso aviso-erro" role="alert">
                  <span>{erro}</span>
                </div>
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

                <button type="submit" className="btn btn-escuro btn-bloco" disabled={enviando || !email}>
                  {enviando ? <span className="spinner spinner-sm" /> : null}
                  {enviando ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
              </form>
            </>
          )}

          <p className="auth__rodape">
            Lembrou a senha? <Link to="/login">Entrar</Link>
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
