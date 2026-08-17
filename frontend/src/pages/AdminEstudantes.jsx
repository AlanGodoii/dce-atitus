import { useCallback, useEffect, useState } from 'react';
import { abrirArquivoProtegido, api, baixarArquivo, mensagemDeErro } from '../services/api';
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

  /**
   * Baixa UMA face em PNG, que é o que a gráfica precisa. O PDF continua na área
   * do aluno, mas é folha A4 para impressão caseira — mandar aquilo para gráfica
   * é o que fazia a resolução parecer ruim.
   *
   * Uma face por clique de propósito. Encadear os dois downloads não funciona: o
   * Chrome bloqueia o segundo arquivo disparado em sequência pela mesma página,
   * e ele some sem erro nenhum — o usuário fica achando que só existe a frente.
   */
  async function baixarFace(estudante, face) {
    setErro('');
    const base = (estudante.nome ?? 'aluno')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const url =
      face === 'verso' ? estudante.carteirinha.arquivoVersoUrl : estudante.carteirinha.arquivoUrl;
    if (!url) {
      setErro(`Esta carteirinha não tem arquivo de ${face}.`);
      return;
    }

    try {
      await baixarArquivo(url, `${base}-${face}.png`);
    } catch (e) {
      setErro(e.message ?? 'Não foi possível baixar a carteirinha.');
    }
  }

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
                  <th>Física</th>
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
                      <span className={e.querFisica ? 'marca-fisica' : 'marca-fisica--nao'}>
                        {e.querFisica ? 'Sim' : 'Não'}
                      </span>
                    </td>
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
                          <button
                            type="button"
                            className="btn-texto"
                            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => baixarFace(e, 'frente')}
                          >
                            PNG frente
                          </button>
                        ) : null}
                        {e.carteirinha?.arquivoVersoUrl ? (
                          <button
                            type="button"
                            className="btn-texto"
                            style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => baixarFace(e, 'verso')}
                          >
                            PNG verso
                          </button>
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
