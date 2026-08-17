import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, baixarArquivo, mensagemDeErro } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CarteirinhaVisual from '../components/CarteirinhaVisual';
import AvisoEmailNaoVerificado from '../components/AvisoEmailNaoVerificado';
import Carregando from '../components/Carregando';
import './Painel.css';

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarChavePix(chave, tipo) {
  if (tipo === 'CNPJ' && chave?.length === 14) {
    return `${chave.slice(0, 2)}.${chave.slice(2, 5)}.${chave.slice(5, 8)}/${chave.slice(8, 12)}-${chave.slice(12)}`;
  }
  return chave;
}

function formatarData(valor) {
  if (!valor) return '--';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(valor));
}

export default function CarteiraDigital() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState('');

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/carteirinha');
      setDados(data);
      setErro('');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(dados.pagamento.chavePix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setAviso('Não foi possível copiar. Selecione a chave manualmente.');
    }
  }

  async function informarPagamento() {
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      const { data } = await api.post('/carteirinha/informar-pagamento', {});
      setAviso(data.mensagem);
      await carregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  }

  /** Nome do arquivo salvo: quem baixa precisa reconhecer depois, na pasta. */
  async function baixar(url, qual) {
    setBaixando(qual);
    setErro('');
    try {
      const sufixo = { frente: 'frente.png', verso: 'verso.png', pdf: 'impressao.pdf' }[qual];
      const nome = (usuario?.nome ?? 'carteirinha')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      await baixarArquivo(url, `carteirinha-${nome}-${sufixo}`);
    } catch (e) {
      setErro(e.message ?? 'Não foi possível baixar o arquivo.');
    } finally {
      setBaixando('');
    }
  }

  async function reenviarEmail() {
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      const { data } = await api.post('/carteirinha/reenviar-email', {});
      setAviso(data.mensagem);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <Carregando texto="Carregando sua carteirinha..." />;

  // --- perfil incompleto ---------------------------------------------------
  if (!dados?.carteirinha) {
    return (
      <div className="pagina__conteudo">
        <header className="pagina__cabecalho">
          <div>
            <h1 className="pagina__titulo">Carteira Digital</h1>
            <p className="pagina__sub">Sua carteirinha estudantil do DCE ATITUS.</p>
          </div>
        </header>

        <AvisoEmailNaoVerificado />

        <div className="cartao">
          <div className="vazio">
            <h3>Falta pouco</h3>
            <p style={{ marginBottom: 22 }}>{dados?.proximoPasso ?? 'Complete seu perfil para solicitar a carteirinha.'}</p>
            <Link to="/perfil" className="btn btn-primario">
              Completar meu perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { carteirinha, pagamento } = dados;
  const { status, estudante } = carteirinha;
  const aprovada = status === 'aprovada';
  const podePagar = status === 'aguardando_pagamento' || status === 'rejeitada';

  const linkWhats = pagamento?.whatsapp
    ? `https://wa.me/${pagamento.whatsapp}?text=${encodeURIComponent(
        `Olá! Sou ${estudante.nome}, matrícula ${estudante.matricula}. Estou enviando o comprovante do PIX da carteirinha estudantil.`,
      )}`
    : null;

  return (
    <div className="pagina__conteudo">
      <header className="pagina__cabecalho">
        <div>
          <h1 className="pagina__titulo">Carteira Digital</h1>
          <p className="pagina__sub">{carteirinha.detalhe}</p>
        </div>
        <span className={`selo selo-${status}`}>{carteirinha.titulo}</span>
      </header>

      <AvisoEmailNaoVerificado />

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

      {status === 'rejeitada' ? (
        <div className="aviso aviso-atencao">
          O DCE não conseguiu confirmar seu pagamento. Reenvie o comprovante pelo WhatsApp e avise
          aqui embaixo.
        </div>
      ) : null}

      {status === 'pagamento_em_analise' ? (
        <div className="aviso aviso-info">
          Seu comprovante está na fila de conferência do DCE. Assim que for aprovado, a carteirinha
          chega no seu e-mail automaticamente.
        </div>
      ) : null}

      <div className="colunas">
        <section>
          {aprovada && carteirinha.arquivoUrl ? (
            <>
              <div className="carteira-faces">
                <img className="carteira-imagem" src={carteirinha.arquivoUrl} alt="Frente da sua carteirinha" />
                {carteirinha.arquivoVersoUrl ? (
                  <img className="carteira-imagem" src={carteirinha.arquivoVersoUrl} alt="Verso da sua carteirinha" />
                ) : null}
              </div>

              <div className="carteira-acoes">
                <button
                  type="button"
                  className="btn btn-primario"
                  onClick={() => baixar(carteirinha.arquivoUrl, 'frente')}
                  disabled={baixando}
                >
                  {baixando === 'frente' ? 'Baixando...' : 'Baixar frente (PNG)'}
                </button>
                {carteirinha.arquivoVersoUrl ? (
                  <button
                    type="button"
                    className="btn btn-contorno"
                    onClick={() => baixar(carteirinha.arquivoVersoUrl, 'verso')}
                    disabled={baixando}
                  >
                    {baixando === 'verso' ? 'Baixando...' : 'Baixar verso (PNG)'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-contorno"
                  onClick={() => baixar(carteirinha.arquivoUrl.replace(/-frente\.png$/, '.pdf'), 'pdf')}
                  disabled={baixando}
                >
                  {baixando === 'pdf' ? 'Baixando...' : 'Baixar PDF'}
                </button>
                <button type="button" className="btn btn-contorno" onClick={reenviarEmail} disabled={ocupado}>
                  {ocupado ? 'Enviando...' : 'Reenviar por e-mail'}
                </button>
              </div>
              <p className="pagina__sub" style={{ marginTop: 10 }}>
                Para imprimir numa gráfica, prefira os PNG: eles saem em 600 dpi, na medida exata do
                cartão. O PDF é a folha pronta para imprimir em casa e recortar.
              </p>
            </>
          ) : (
            <>
              <CarteirinhaVisual estudante={estudante} />
              <p className="pagina__sub" style={{ marginTop: 14 }}>
                Prévia da sua carteirinha. O QR Code é liberado quando o DCE confirmar o pagamento.
              </p>
            </>
          )}
        </section>

        <section>
          {podePagar && pagamento?.chavePix ? (
            <div className="pix-caixa">
              <h3>Pagamento por PIX</h3>
              <p>
                Faça o PIX e mande o comprovante no WhatsApp do DCE. O valor é o mesmo com ou sem a
                via impressa; se você pediu a impressa, o DCE avisa quando estiver pronta.
              </p>

              <div className="pix-linha">
                <span>Valor</span>
                <strong>{formatarMoeda(pagamento.valor)}</strong>
              </div>

              <div className="pix-linha">
                <span>Chave PIX ({pagamento.tipoChavePix})</span>
                <div className="pix-chave">
                  <strong>{formatarChavePix(pagamento.chavePix, pagamento.tipoChavePix)}</strong>
                  <button type="button" className="pix-copiar" onClick={copiarPix}>
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="pix-linha">
                <span>Beneficiário</span>
                <strong>{pagamento.beneficiario}</strong>
              </div>

              {linkWhats ? (
                <a className="pix-whats" href={linkWhats} target="_blank" rel="noreferrer">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2s-.7 1-.9 1.2c-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.6-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.6s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.3 3.3c.2.2 2.3 3.6 5.7 5 2.1.9 2.9 1 4 .8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2" />
                  </svg>
                  Enviar comprovante no WhatsApp
                </a>
              ) : null}

              <div className="separador" style={{ background: 'rgba(255,255,255,.16)' }} />

              <button
                type="button"
                className="btn btn-contorno-claro btn-bloco"
                onClick={informarPagamento}
                disabled={ocupado || !usuario?.emailVerificado}
                title={
                  usuario?.emailVerificado ? undefined : 'Confirme seu e-mail antes de continuar.'
                }
              >
                {ocupado ? 'Avisando...' : 'Já enviei o comprovante'}
              </button>

              {!usuario?.emailVerificado ? (
                <p
                  style={{
                    marginTop: 10,
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,.72)',
                    textAlign: 'center',
                  }}
                >
                  Confirme seu e-mail para liberar este passo.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="cartao" style={{ marginTop: podePagar ? 20 : 0 }}>
            <div className="cartao-corpo">
              <h2 className="bloco-titulo">Dados da carteirinha</h2>
              <p className="bloco-sub">Como aparecem no documento.</p>

              <dl className="dados-lista">
                <div className="dados-item">
                  <dt>Nome</dt>
                  <dd>{estudante.nome}</dd>
                </div>
                <div className="dados-item">
                  <dt>CPF</dt>
                  <dd>{estudante.cpfFormatado}</dd>
                </div>
                <div className="dados-item">
                  <dt>Matrícula</dt>
                  <dd>{estudante.matricula}</dd>
                </div>
                <div className="dados-item">
                  <dt>Curso</dt>
                  <dd>{estudante.curso}</dd>
                </div>
                <div className="dados-item">
                  <dt>Nível</dt>
                  <dd>{estudante.nivelRotulo}</dd>
                </div>
                {aprovada ? (
                  <>
                    <div className="dados-item">
                      <dt>Emitida em</dt>
                      <dd>{formatarData(carteirinha.dataEmissao)}</dd>
                    </div>
                    <div className="dados-item">
                      <dt>Válida até</dt>
                      <dd>{formatarData(carteirinha.dataValidade)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>

              {aprovada && carteirinha.urlValidacao ? (
                <>
                  <div className="separador" />
                  <p className="bloco-sub" style={{ marginBottom: 8 }}>
                    Link público de validação:
                  </p>
                  <a
                    href={carteirinha.urlValidacao}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-texto"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {carteirinha.urlValidacao}
                  </a>
                </>
              ) : null}

              {!aprovada ? (
                <>
                  <div className="separador" />
                  <Link to="/perfil" className="btn btn-contorno btn-sm">
                    Corrigir meus dados
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
