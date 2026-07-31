import { useCallback, useEffect, useState } from 'react';
import { abrirArquivoProtegido, api, mensagemDeErro } from '../services/api';
import Carregando from '../components/Carregando';
import './Painel.css';

function formatarDataHora(valor) {
  if (!valor) return '--';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(valor),
  );
}

export default function AdminPagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [busca, setBusca] = useState('');
  const [totalNaFila, setTotalNaFila] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async (termo = '') => {
    try {
      const [fila, contagem] = await Promise.all([
        api.get('/admin/pagamentos-pendentes', {
          params: { busca: termo.trim() || undefined },
        }),
        api.get('/admin/resumo'),
      ]);
      setPagamentos(fila.data.pagamentos);
      setTotalNaFila(fila.data.totalNaFila ?? fila.data.total);
      setResumo(contagem.data);
      setErro('');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Espera parar de digitar para não disparar uma busca por tecla.
    const id = setTimeout(() => carregar(busca), 350);
    return () => clearTimeout(id);
  }, [busca, carregar]);

  async function aprovar(pagamento) {
    setProcessando(pagamento.pagamentoId);
    setErro('');
    setAviso('');
    try {
      const { data } = await api.patch(`/admin/pagamentos/${pagamento.pagamentoId}/aprovar`);

      // A aprovação vale mesmo se a geração ou o e-mail falharem; o admin
      // precisa saber exatamente o que deu certo.
      let texto = data.mensagem;
      if (data.geracaoArquivos?.ok === false) {
        texto += ` ATENÇÃO: falha ao gerar os arquivos (${data.geracaoArquivos.erro}).`;
      } else if (!data.email?.enviado) {
        texto += ` O documento foi gerado, mas o e-mail não saiu (${data.email?.motivo}). O aluno pode reenviar pela área dele.`;
      } else {
        texto += ' Carteirinha gerada e enviada por e-mail.';
      }
      setAviso(texto);
      await carregar(busca);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(null);
    }
  }

  async function verComprovante(pagamento) {
    setErro('');
    try {
      await abrirArquivoProtegido(`/admin/estudantes/${pagamento.estudante.perfilId}/comprovante`);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível abrir o comprovante.'));
    }
  }

  async function rejeitar(pagamento) {
    const motivo = window.prompt(
      `Por que o pagamento de ${pagamento.estudante.nome} não foi confirmado?\n(O aluno recebe essa observação por e-mail.)`,
      '',
    );
    if (motivo === null) return;

    setProcessando(pagamento.pagamentoId);
    setErro('');
    setAviso('');
    try {
      const { data } = await api.patch(`/admin/pagamentos/${pagamento.pagamentoId}/rejeitar`, {
        motivo: motivo.trim() || undefined,
      });
      setAviso(data.mensagem);
      await carregar(busca);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setProcessando(null);
    }
  }

  if (carregando) return <Carregando texto="Carregando a fila de pagamentos..." />;

  return (
    <div className="pagina__conteudo">
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Pagamentos pendentes</h1>
          <p className="pagina__sub">
            Confira o comprovante no WhatsApp e aprove para emitir a carteirinha.
          </p>
        </div>
        <button type="button" className="btn btn-contorno btn-sm" onClick={() => carregar(busca)}>
          Atualizar
        </button>
      </header>

      {resumo ? (
        <div className="resumo-grade">
          <div className="resumo-card resumo-card--destaque">
            <span>Na fila</span>
            <strong>{resumo.pagamentosPendentes}</strong>
          </div>
          <div className="resumo-card">
            <span>Emitidas</span>
            <strong>{resumo.carteirinhas.aprovada}</strong>
          </div>
          <div className="resumo-card">
            <span>Aguardando pagamento</span>
            <strong>{resumo.carteirinhas.aguardando_pagamento}</strong>
          </div>
          <div className="resumo-card">
            <span>Estudantes</span>
            <strong>{resumo.totalEstudantes}</strong>
          </div>
        </div>
      ) : null}

      <div className="barra-busca">
        <input
          type="search"
          placeholder="Buscar na fila por nome, CPF, matrícula ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar estudante na fila"
        />
        {busca ? (
          <button type="button" className="btn btn-contorno btn-sm" onClick={() => setBusca('')}>
            Limpar
          </button>
        ) : null}
      </div>

      {busca ? (
        <p className="ajuda" style={{ marginTop: -8, marginBottom: 16 }}>
          {pagamentos.length === 0
            ? `Ninguém na fila corresponde a "${busca}".`
            : `${pagamentos.length} de ${totalNaFila} na fila correspondem a "${busca}".`}
        </p>
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

      {pagamentos.length === 0 ? (
        <div className="cartao">
          <div className="vazio">
            {busca ? (
              <>
                <h3>Nenhum resultado</h3>
                <p>
                  Ninguém na fila corresponde a &quot;{busca}&quot;. A pessoa pode ainda não ter
                  avisado que pagou — confira em <strong>Estudantes</strong>.
                </p>
              </>
            ) : (
              <>
                <h3>Nenhum pagamento na fila</h3>
                <p>Quando um estudante avisar que enviou o comprovante, ele aparece aqui.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        pagamentos.map((p) => (
          <article key={p.pagamentoId} className="fila-item">
            {p.estudante.fotoUrl ? (
              <img className="fila-foto" src={p.estudante.fotoUrl} alt="" />
            ) : (
              <div className="fila-foto" />
            )}

            <div className="fila-dados">
              <h2 className="fila-nome">{p.estudante.nome}</h2>
              <p className="fila-curso">
                {p.estudante.curso} · {p.estudante.nivelRotulo}
              </p>

              <div className="fila-grade">
                <div>
                  <span>CPF</span>
                  <strong>{p.estudante.cpfFormatado}</strong>
                </div>
                <div>
                  <span>Matrícula</span>
                  <strong>{p.estudante.matricula}</strong>
                </div>
                <div>
                  <span>WhatsApp</span>
                  <strong>
                    {p.estudante.whatsapp ? (
                      <a
                        href={`https://wa.me/${p.estudante.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--verde-700)' }}
                      >
                        {p.estudante.whatsappFormatado}
                      </a>
                    ) : (
                      '--'
                    )}
                  </strong>
                </div>
                <div>
                  <span>E-mail</span>
                  <strong>{p.estudante.email}</strong>
                </div>
                <div>
                  <span>Avisou em</span>
                  <strong>{formatarDataHora(p.solicitadoEm)}</strong>
                </div>
              </div>

              {p.observacaoEstudante ? (
                <p className="fila-observacao">
                  <strong>Observação do aluno:</strong> {p.observacaoEstudante}
                </p>
              ) : null}
            </div>

            <div className="fila-acoes">
              {p.estudante.temComprovante ? (
                <button
                  type="button"
                  className="btn btn-contorno btn-sm"
                  onClick={() => verComprovante(p)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M14 2.5H7a2 2 0 00-2 2v15a2 2 0 002 2h10a2 2 0 002-2V7.5z" />
                    <path d="M14 2.5v5h5" />
                  </svg>
                  Ver matrícula
                </button>
              ) : (
                <span className="selo selo-rejeitada" style={{ justifyContent: 'center' }}>
                  Sem comprovante
                </span>
              )}

              <button
                type="button"
                className="btn btn-primario btn-sm"
                onClick={() => aprovar(p)}
                disabled={processando === p.pagamentoId}
              >
                {processando === p.pagamentoId ? 'Emitindo...' : 'Aprovar e emitir'}
              </button>
              <button
                type="button"
                className="btn btn-contorno btn-sm"
                onClick={() => rejeitar(p)}
                disabled={processando === p.pagamentoId}
              >
                Rejeitar
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
