import { useCallback, useEffect, useState } from 'react';
import { api, mensagemDeErro } from '../services/api';
import Carregando from '../components/Carregando';
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
          {erro}
        </div>
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
                  <th>Documento</th>
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
                      {e.carteirinha?.arquivoUrl ? (
                        <a
                          href={e.carteirinha.arquivoUrl.replace(/-frente\.png$/, '.pdf')}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-texto"
                        >
                          Ver PDF
                        </a>
                      ) : (
                        <span style={{ color: 'var(--cinza-300)' }}>--</span>
                      )}
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
