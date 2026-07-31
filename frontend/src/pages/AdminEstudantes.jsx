import { useCallback, useEffect, useState } from 'react';
import { abrirArquivoProtegido, api, mensagemDeErro } from '../services/api';
import Carregando from '../components/Carregando';
import ModalEditarEstudante from '../components/ModalEditarEstudante';
import './Painel.css';

const STATUS = [
  { valor: '', rotulo: 'Todos os status' },
  { valor: 'aguardando_pagamento', rotulo: 'Aguardando pagamento' },
  { valor: 'pagamento_em_analise', rotulo: 'Pagamento em análise' },
  { valor: 'aprovada', rotulo: 'Aprovada' },
  { valor: 'rejeitada', rotulo: 'Rejeitada' },
];

const ROTULO_STATUS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_em_analise: 'Em análise',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};

function formatarData(valor) {
  if (!valor) return '--';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(valor));
}

export default function AdminEstudantes() {
  const [estudantes, setEstudantes] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async (termo, filtroStatus) => {
    setCarregando(true);
    try {
      const { data } = await api.get('/admin/estudantes', {
        params: { busca: termo || undefined, status: filtroStatus || undefined },
      });
      setEstudantes(data.estudantes);
      setErro('');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Espera o usuário parar de digitar para não disparar uma busca por tecla.
    const id = setTimeout(() => carregar(busca, status), 350);
    return () => clearTimeout(id);
  }, [busca, status, carregar]);

  async function verComprovante(estudante) {
    setErro('');
    try {
      await abrirArquivoProtegido(`/admin/estudantes/${estudante.perfilId}/comprovante`);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível abrir o comprovante.'));
    }
  }

  return (
    <div className="pagina__conteudo" style={{ maxWidth: 1180 }}>
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Estudantes</h1>
          <p className="pagina__sub">Todos os cadastros e o estado de cada carteirinha.</p>
        </div>
      </header>

      <div className="barra-busca">
        <input
          type="search"
          placeholder="Buscar por nome, e-mail, CPF ou matrícula"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar estudante"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
      </div>

      {erro ? (
        <div className="aviso aviso-erro" role="alert">
          <span>{erro}</span>
        </div>
      ) : null}
      {aviso ? (
        <div className="aviso aviso-ok" role="status">
          <span>{aviso}</span>
        </div>
      ) : null}

      {editando ? (
        <ModalEditarEstudante
          estudante={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(resultado) => {
            setEditando(null);
            let texto = resultado.mensagem;
            if (resultado.reemissao?.reemitida) {
              texto += resultado.email?.enviado
                ? ' O aluno recebeu a nova carteirinha por e-mail.'
                : ` A carteirinha foi regerada, mas o e-mail não saiu (${resultado.email?.motivo}).`;
            } else if (resultado.reemissao?.erro) {
              texto += ` ATENÇÃO: falha ao reemitir (${resultado.reemissao.erro}).`;
            }
            setAviso(texto);
            carregar(busca, status);
          }}
        />
      ) : null}

      {carregando ? (
        <Carregando texto="Buscando..." />
      ) : estudantes.length === 0 ? (
        <div className="cartao">
          <div className="vazio">
            <h3>Nenhum estudante encontrado</h3>
            <p>Ajuste a busca ou o filtro de status.</p>
          </div>
        </div>
      ) : (
        <div className="cartao">
          <div className="tabela-scroll">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Estudante</th>
                  <th>Matrícula</th>
                  <th>Curso</th>
                  <th>Status</th>
                  <th>Validade</th>
                  <th>Documentos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {estudantes.map((e) => (
                  <tr key={e.perfilId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        {e.fotoUrl ? (
                          <img
                            src={e.fotoUrl}
                            alt=""
                            style={{
                              width: 36,
                              height: 48,
                              objectFit: 'cover',
                              borderRadius: 6,
                              flexShrink: 0,
                            }}
                          />
                        ) : null}
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block' }}>{e.nome}</strong>
                          <span style={{ color: 'var(--cinza-500)', fontSize: 13 }}>{e.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{e.matricula}</td>
                    <td>{e.curso}</td>
                    <td>
                      {e.carteirinha ? (
                        <span className={`selo selo-${e.carteirinha.status}`}>
                          {ROTULO_STATUS[e.carteirinha.status]}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--cinza-500)' }}>Sem carteirinha</span>
                      )}
                    </td>
                    <td>{formatarData(e.carteirinha?.dataValidade)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {e.carteirinha?.arquivoUrl ? (
                          <a
                            href={e.carteirinha.arquivoUrl.replace(/-frente\.png$/, '.pdf')}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-texto"
                            style={{ padding: 0 }}
                          >
                            Carteirinha
                          </a>
                        ) : null}
                        {e.temComprovante ? (
                          <button
                            type="button"
                            className="btn-texto"
                            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => verComprovante(e)}
                          >
                            Matrícula
                          </button>
                        ) : (
                          <span style={{ color: 'var(--cinza-500)', fontSize: 13 }}>sem matrícula</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-contorno btn-sm"
                        onClick={() => setEditando(e)}
                      >
                        Corrigir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
