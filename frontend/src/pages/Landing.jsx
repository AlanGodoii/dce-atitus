import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoDce from '../components/LogoDce';
import HeroFundo from '../components/HeroFundo';
import { api } from '../services/api';
import './Landing.css';

const BENEFICIOS = [
  {
    titulo: 'Meia-entrada garantida',
    texto:
      'Direito a pagar metade do valor em cinemas, shows, teatros e eventos esportivos, conforme a Lei Federal nº 12.933/2013.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 8.5V6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v2a2.4 2.4 0 000 4.8v2.2a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 15.5v-2.2a2.4 2.4 0 000-4.8z" />
        <path d="M14 5v14" strokeDasharray="2 2.5" />
      </svg>
    ),
  },
  {
    titulo: 'Digital e física',
    texto:
      'A digital chega no seu e-mail e fica na área do estudante. A física está inclusa no mesmo pagamento e o DCE entra em contato para você retirar.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </svg>
    ),
  },
  {
    titulo: 'Validação na hora',
    texto:
      'Cada carteirinha tem um QR Code único. Qualquer estabelecimento confere a autenticidade em segundos, sem precisar ligar para o DCE.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3h-3zM20 14v3M14 20h7" />
      </svg>
    ),
  },
  {
    titulo: 'Documento oficial do DCE',
    texto:
      'Emitida pelo Diretório Central de Estudantes da ATITUS, com os dados e o padrão exigidos para a Carteira de Identificação Estudantil.',
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 2.7l7.5 3v5.6c0 4.4-3.1 8.2-7.5 9.4-4.4-1.2-7.5-5-7.5-9.4V5.7z" />
        <path d="M9 12.2l2.2 2.2 4-4.3" />
      </svg>
    ),
  },
];

const PASSOS = [
  { n: 1, titulo: 'Crie sua conta', texto: 'Com e-mail e senha ou direto pelo Google. Leva menos de um minuto.' },
  { n: 2, titulo: 'Preencha seu perfil', texto: 'Nome, CPF, matrícula, curso e uma foto 3x4. São os dados que vão impressos na carteirinha.' },
  { n: 3, titulo: 'Pague por PIX', texto: 'Faça o PIX para o DCE e mande o comprovante no WhatsApp.' },
  { n: 4, titulo: 'Receba no e-mail', texto: 'Assim que o DCE confirmar, sua carteirinha é emitida com QR Code e enviada automaticamente.' },
];

export default function Landing() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api
      .get('/config-publica')
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="container landing__header-inner">
          <Link to="/" aria-label="Início">
            <LogoDce cor="branco" escala={0.52} />
          </Link>

          <nav className="landing__nav" aria-label="Navegação principal">
            <a href="#inicio">Início</a>
            <a href="#beneficios">Benefícios</a>
            <a href="#como-funciona">Como funciona</a>
            <Link to="/validar">Validar Carteirinha</Link>
          </nav>

          <Link to="/login" className="btn btn-primario btn-sm landing__btn-login">
            Entrar
          </Link>
        </div>
      </header>

      <section className="landing__hero" id="inicio">
        <HeroFundo />

        <div className="container landing__hero-inner">
          <span className="landing__selo">DCE · ATITUS EDUCAÇÃO</span>

          <h1 className="landing__titulo">
            Carteira Estudantil
            <br />
            <span>Digital</span>
          </h1>

          <p className="landing__subtitulo">
            A carteirinha oficial do Diretório Central Matheus Teixeira.
          </p>
          <p className="landing__apoio">
            Tenha sua carteirinha no celular e aproveite a meia-entrada garantida por lei.
          </p>

          <div className="landing__ctas">
            <Link to="/cadastro" className="btn btn-primario">
              Criar conta / Entrar
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h13M12 5.5l6.5 6.5-6.5 6.5" />
              </svg>
            </Link>
            <Link to="/validar" className="btn btn-contorno-claro">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 2.7l7.5 3v5.6c0 4.4-3.1 8.2-7.5 9.4-4.4-1.2-7.5-5-7.5-9.4V5.7z" />
                <path d="M9 12.2l2.2 2.2 4-4.3" />
              </svg>
              Validar Carteirinha
            </Link>
          </div>
        </div>
      </section>

      <section className="landing__secao" id="beneficios">
        <div className="container">
          <h2 className="landing__secao-titulo">Por que ter a carteirinha do DCE</h2>
          <p className="landing__secao-texto">
            Mais que um documento: é o seu direito de estudante reconhecido em todo o país.
          </p>

          <div className="landing__grade">
            {BENEFICIOS.map((b) => (
              <article key={b.titulo} className="landing__card">
                <span className="landing__card-icone">{b.icone}</span>
                <h3>{b.titulo}</h3>
                <p>{b.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__secao landing__secao--clara" id="como-funciona">
        <div className="container">
          <h2 className="landing__secao-titulo">Como funciona</h2>
          <p className="landing__secao-texto">Quatro passos entre criar a conta e ter a carteirinha na mão.</p>

          <ol className="landing__passos">
            {PASSOS.map((p) => (
              <li key={p.n} className="landing__passo">
                <span className="landing__passo-n">{p.n}</span>
                <div>
                  <h3>{p.titulo}</h3>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          {config?.pagamento?.valor ? (
            <p className="landing__valor">
              Valor da carteirinha:{' '}
              <strong>
                {config.pagamento.valor.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </strong>
              <span>
                Já inclui a versão digital e a física — o DCE entra em contato para a retirada.
              </span>
            </p>
          ) : null}

          <div className="landing__cta-final">
            <Link to="/cadastro" className="btn btn-primario">
              Quero minha carteirinha
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="container landing__footer-inner">
          <div>
            <LogoDce cor="branco" escala={0.55} />
            <p className="landing__footer-texto">
              Diretório Central de Estudantes
              <br />
              ATITUS Educação
            </p>
          </div>

          <div className="landing__footer-contato">
            <h4>Contato</h4>
            {config?.dce?.email ? <a href={`mailto:${config.dce.email}`}>{config.dce.email}</a> : null}
            {config?.dce?.whatsapp ? (
              <a href={`https://wa.me/${config.dce.whatsapp}`} target="_blank" rel="noreferrer">
                WhatsApp do DCE
              </a>
            ) : null}
          </div>

          <div className="landing__footer-contato">
            <h4>Links</h4>
            <Link to="/validar">Validar carteirinha</Link>
            <Link to="/login">Área do estudante</Link>
          </div>
        </div>

        <div className="container landing__footer-base">
          <span>© {new Date().getFullYear()} DCE ATITUS. Todos os direitos reservados.</span>
          <span>Carteira de Identificação Estudantil — Lei Federal nº 12.933/2013</span>
        </div>
      </footer>
    </div>
  );
}
