import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, errosPorCampo, mensagemDeErro } from '../services/api';
import LogoDce from '../components/LogoDce';
import PainelMarca from '../components/PainelMarca';
import './Auth.css';

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { entrarComToken } = useAuth();

  // Com token na URL (veio do link do e-mail), o formulário pede só a senha.
  const tokenDaUrl = params.get('token');

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);

  const naoConfere = confirmacao.length > 0 && senha !== confirmacao;

  async function enviar(evento) {
    evento.preventDefault();
    if (naoConfere) return;

    setErro('');
    setErros({});
    setEnviando(true);
    try {
      const { data } = await api.post('/auth/redefinir-senha', {
        ...(tokenDaUrl ? { token: tokenDaUrl } : { email, codigo }),
        senha,
      });
      setPronto(true);
      await entrarComToken(data.token);
      setTimeout(() => navegar('/carteirinha', { replace: true }), 1600);
    } catch (e) {
      setErros(errosPorCampo(e));
      setErro(mensagemDeErro(e, 'Não foi possível trocar a senha.'));
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

          {pronto ? (
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
              <h1 className="auth__titulo">Senha alterada</h1>
              <p className="auth__sub">
                Você já está conectado. Levando você para a sua carteirinha...
              </p>
            </>
          ) : (
            <>
              <h1 className="auth__titulo">Criar senha nova</h1>
              <p className="auth__sub">
                {tokenDaUrl
                  ? 'Escolha uma senha nova para a sua conta.'
                  : 'Informe o e-mail, o código que recebemos e a nova senha.'}
              </p>

              {erro ? (
                <div className="aviso aviso-erro" role="alert">
                  <span>{erro}</span>
                </div>
              ) : null}

              <form onSubmit={enviar} noValidate>
                {!tokenDaUrl ? (
                  <>
                    <div className="campo">
                      <label htmlFor="email">Seu e-mail</label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
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
                        style={{ fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: 'monospace' }}
                        required
                      />
                    </div>
                  </>
                ) : null}

                <div className="campo">
                  <label htmlFor="senha">Nova senha</label>
                  <input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
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
                  <label htmlFor="confirmacao">Repita a nova senha</label>
                  <input
                    id="confirmacao"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    aria-invalid={naoConfere}
                    required
                  />
                  {naoConfere ? <p className="erro">As senhas não são iguais.</p> : null}
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 14,
                    color: 'var(--cinza-700)',
                    marginBottom: 18,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={mostrarSenha}
                    onChange={(e) => setMostrarSenha(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  Mostrar senha
                </label>

                <button
                  type="submit"
                  className="btn btn-escuro btn-bloco"
                  disabled={enviando || naoConfere || !senha || (!tokenDaUrl && (!email || codigo.length !== 6))}
                >
                  {enviando ? <span className="spinner spinner-sm" /> : null}
                  {enviando ? 'Salvando...' : 'Salvar nova senha'}
                </button>
              </form>

              <p className="ajuda" style={{ textAlign: 'center', marginTop: 14 }}>
                Ao trocar a senha, as sessões abertas em outros aparelhos são encerradas.
              </p>
            </>
          )}

          <p className="auth__rodape">
            <Link to="/esqueci-senha">Pedir um novo link</Link> · <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
