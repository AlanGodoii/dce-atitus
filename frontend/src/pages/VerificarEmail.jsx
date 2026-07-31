import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemDeErro, tokenStorage } from '../services/api';
import LogoDce from '../components/LogoDce';
import PainelMarca from '../components/PainelMarca';
import './Auth.css';

export default function VerificarEmail() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { usuario, entrarComToken, recarregar } = useAuth();

  const tokenDaUrl = params.get('token');
  const emailInicial = params.get('email') ?? usuario?.email ?? '';
  // Chegou aqui barrado pela RotaProtegida (tentou entrar sem confirmar).
  const foiBloqueado = params.get('aviso') === 'bloqueado';

  const [estado, setEstado] = useState(tokenDaUrl ? 'verificando' : 'formulario');
  // Sessão manda: se está logado, é sempre o e-mail da conta.
  const [email, setEmail] = useState(usuario?.email ?? emailInicial);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const jaTentouLink = useRef(false);

  const concluir = useCallback(
    async (data) => {
      setEstado('ok');
      setAviso(data.mensagem);
      if (data.token) await entrarComToken(data.token);
      else await recarregar();
      setTimeout(() => navegar('/carteirinha', { replace: true }), 1600);
    },
    [entrarComToken, recarregar, navegar],
  );

  // Confirmação pelo link do e-mail.
  useEffect(() => {
    if (!tokenDaUrl || jaTentouLink.current) return;
    jaTentouLink.current = true;

    api
      .post('/auth/verificar-email', { token: tokenDaUrl })
      .then(({ data }) => concluir(data))
      .catch((e) => {
        setErro(mensagemDeErro(e, 'Não foi possível confirmar o seu e-mail.'));
        setEstado('formulario');
      });
  }, [tokenDaUrl, concluir]);

  async function confirmarPorCodigo(evento) {
    evento.preventDefault();
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      const { data } = await api.post('/auth/verificar-email', { email, codigo });
      await concluir(data);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Código inválido.'));
    } finally {
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro('');
    setAviso('');
    setEnviando(true);
    try {
      const { data } = await api.post('/auth/reenviar-verificacao', {
        email: usuario?.email ?? email,
      });
      setAviso(
        data.dev?.codigo
          ? `${data.mensagem} (ambiente de desenvolvimento — código: ${data.dev.codigo})`
          : data.mensagem,
      );
    } catch (e) {
      setErro(mensagemDeErro(e));
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

          {estado === 'verificando' ? (
            <div style={{ display: 'grid', placeItems: 'center', gap: 16, padding: '32px 0' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--cinza-500)' }}>Confirmando seu e-mail...</p>
            </div>
          ) : estado === 'ok' ? (
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M4.5 12.5l5 5 10-11" />
                </svg>
              </div>
              <h1 className="auth__titulo">E-mail confirmado</h1>
              <p className="auth__sub">{aviso} Levando você para a sua carteirinha...</p>
            </>
          ) : (
            <>
              <h1 className="auth__titulo">Confirme seu e-mail</h1>
              <p className="auth__sub">
                Mandamos um link e um código de 6 dígitos para o seu e-mail. É por ali que a sua
                carteirinha vai chegar, então precisamos confirmar que o endereço é seu.
              </p>

              {foiBloqueado && !erro && !aviso ? (
                <div className="aviso aviso-atencao" role="alert">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ flexShrink: 0, marginTop: 1 }}
                    aria-hidden="true"
                  >
                    <path d="M12 3.5l9.5 16.5h-19z" />
                    <path d="M12 10v4.5M12 17.5v.1" />
                  </svg>
                  <div>
                    <strong>Seu e-mail ainda não foi confirmado.</strong>
                    <br />
                    Sua área do estudante fica bloqueada até você confirmar. Verifique a caixa de
                    entrada (e o spam) ou peça um novo e-mail abaixo.
                  </div>
                </div>
              ) : null}

              {erro ? (
                <div className="aviso aviso-erro" role="alert">
                  {erro}
                </div>
              ) : null}
              {aviso ? (
                <div className="aviso aviso-ok" role="status">
                  {aviso}
                </div>
              ) : null}

              <form onSubmit={confirmarPorCodigo} noValidate>
                <div className="campo">
                  <label htmlFor="email">Seu e-mail</label>
                  {usuario?.email ? (
                    // Logado: o e-mail vem da sessão e não pode ser trocado. Deixar
                    // editável abria espaço para o autofill do navegador colocar
                    // outro endereço, e aí o reenvio "some" sem explicação.
                    <input
                      id="email"
                      type="email"
                      value={usuario.email}
                      readOnly
                      style={{ background: 'var(--cinza-50)', color: 'var(--cinza-700)' }}
                    />
                  ) : (
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  )}
                </div>

                <div className="campo">
                  <label htmlFor="codigo">Código de 6 dígitos</label>
                  <input
                    id="codigo"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      fontSize: 26,
                      letterSpacing: 10,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-escuro btn-bloco"
                  disabled={enviando || codigo.length !== 6 || !email}
                >
                  {enviando ? <span className="spinner spinner-sm" /> : null}
                  {enviando ? 'Confirmando...' : 'Confirmar e-mail'}
                </button>
              </form>

              <p className="auth__rodape">
                Não recebeu?{' '}
                <button
                  type="button"
                  className="btn-texto"
                  onClick={reenviar}
                  disabled={enviando || !email}
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  Reenviar e-mail
                </button>
              </p>

              <p className="ajuda" style={{ textAlign: 'center', marginTop: 4 }}>
                Confira também a caixa de spam.
              </p>
            </>
          )}

          <Link
            to={tokenStorage.ler() ? '/carteirinha' : '/login'}
            className="auth__voltar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H6M12 5.5L5.5 12l6.5 6.5" />
            </svg>
            {tokenStorage.ler() ? 'Voltar para a minha área' : 'Voltar para o login'}
          </Link>
        </div>
      </div>
    </div>
  );
}
