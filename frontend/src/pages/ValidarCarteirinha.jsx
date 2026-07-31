import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import LogoDce from '../components/LogoDce';
import './Validar.css';

function formatarData(valor) {
  if (!valor) return '--';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(valor));
}

const ICONE_OK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M7.8 12.4l2.9 2.9 5.5-6" />
  </svg>
);

const ICONE_ERRO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" />
  </svg>
);

const ICONE_ALERTA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.2v6M12 16.4v.1" />
  </svg>
);

export default function ValidarCarteirinha() {
  const { qrCodeUuid } = useParams();
  const navegar = useNavigate();

  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(qrCodeUuid));
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    if (!qrCodeUuid) {
      setResultado(null);
      setCarregando(false);
      return undefined;
    }

    let ativo = true;
    setCarregando(true);

    api
      .get(`/validar/${qrCodeUuid}`)
      .then(({ data }) => ativo && setResultado(data))
      .catch((e) => {
        if (!ativo) return;
        setResultado(
          e.response?.data ?? {
            valida: false,
            mensagem: 'Não foi possível consultar a carteirinha agora. Tente novamente.',
          },
        );
      })
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [qrCodeUuid]);

  function buscar(evento) {
    evento.preventDefault();
    const limpo = codigo.trim();
    if (limpo) navegar(`/validar/${encodeURIComponent(limpo)}`);
  }

  const estado = !resultado ? null : resultado.valida ? 'ok' : resultado.motivo === 'expirada' ? 'alerta' : 'erro';

  return (
    <div className="validar">
      <header className="validar__topo">
        <Link to="/" aria-label="Início">
          <LogoDce cor="branco" escala={0.5} />
        </Link>
        <Link to="/login" className="btn btn-contorno-claro btn-sm">
          Área do estudante
        </Link>
      </header>

      <main className="validar__main">
        <div className="validar__caixa">
          {carregando ? (
            <div className="validar__carregando">
              <div className="spinner" />
              <p>Consultando a carteirinha...</p>
            </div>
          ) : !resultado ? (
            <>
              <h1 className="validar__titulo">Validar carteirinha</h1>
              <p className="validar__sub">
                Aponte a câmera para o QR Code impresso na carteirinha, ou cole aqui o código de
                validação.
              </p>

              <form onSubmit={buscar} className="validar__form">
                <div className="campo">
                  <label htmlFor="codigo">Código de validação</label>
                  <input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    autoComplete="off"
                    spellCheck="false"
                  />
                </div>
                <button type="submit" className="btn btn-primario btn-bloco" disabled={!codigo.trim()}>
                  Verificar
                </button>
              </form>

              <p className="validar__nota">
                Esta consulta é pública e não exige login. O DCE ATITUS não divulga o CPF completo
                do estudante.
              </p>
            </>
          ) : (
            <>
              <div className={`validar__estado validar__estado--${estado}`}>
                <span className="validar__estado-icone">
                  {estado === 'ok' ? ICONE_OK : estado === 'alerta' ? ICONE_ALERTA : ICONE_ERRO}
                </span>
                <div>
                  <strong>
                    {estado === 'ok'
                      ? 'Carteirinha válida'
                      : estado === 'alerta'
                        ? 'Carteirinha vencida'
                        : 'Carteirinha não encontrada'}
                  </strong>
                  <p>{resultado.mensagem}</p>
                </div>
              </div>

              {resultado.estudante ? (
                <div className="validar__dados">
                  {resultado.estudante.fotoUrl ? (
                    <img className="validar__foto" src={resultado.estudante.fotoUrl} alt="Foto do estudante" />
                  ) : null}

                  <dl className="dados-lista" style={{ flex: 1, minWidth: 210 }}>
                    <div className="dados-item">
                      <dt>Nome</dt>
                      <dd>{resultado.estudante.nome}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>CPF</dt>
                      <dd>{resultado.estudante.cpfMascarado}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Matrícula</dt>
                      <dd>{resultado.estudante.matricula}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Curso</dt>
                      <dd>{resultado.estudante.curso}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Nível</dt>
                      <dd>{resultado.estudante.nivel}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Instituição</dt>
                      <dd>{resultado.estudante.instituicao}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Emitida em</dt>
                      <dd>{formatarData(resultado.documento?.dataEmissao)}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Válida até</dt>
                      <dd>{formatarData(resultado.documento?.dataValidade)}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              <div className="validar__acoes">
                <button
                  type="button"
                  className="btn btn-contorno"
                  onClick={() => {
                    setCodigo('');
                    navegar('/validar');
                  }}
                >
                  Validar outra
                </button>
              </div>

              {resultado.verificadoEm ? (
                <p className="validar__nota">
                  Consulta feita em{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(resultado.verificadoEm))}
                  .
                </p>
              ) : null}
            </>
          )}
        </div>
      </main>

      <footer className="validar__rodape">
        DCE ATITUS · Carteira de Identificação Estudantil — Lei Federal nº 12.933/2013
      </footer>
    </div>
  );
}
