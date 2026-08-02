import LogoDce from './LogoDce';

const CHECK = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
);

/** Lateral escura das telas de login/cadastro. Só decorativa. */
export default function PainelMarca() {
  return (
    <aside className="auth__marca">
      <div className="auth__marca-fundo" aria-hidden="true">
        <svg viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
          <path d="M-50 900 L200 400 L450 900 M150 900 L400 400 L650 900" />
          <path d="M350 -50 L680 250 M680 -50 L350 250" />
        </svg>
      </div>

      <div className="auth__marca-topo">
        <LogoDce cor="branco" escala={0.6} />
      </div>

      <div className="auth__marca-conteudo">
        <h2>
          Sua carteirinha
          <br />
          <span>estudantil digital</span>
        </h2>
        {/* Texto decorativo: não busca a API porque esta tela aparece antes do
            login. O nome oficial vem de DCE_NOME_COMPLETO no backend. */}
        <p>O documento oficial do Diretório Central Matheus Teixeira, direto no seu celular.</p>

        <ul className="auth__lista">
          <li>{CHECK} Meia-entrada garantida pela Lei nº 12.933/2013</li>
          <li>{CHECK} QR Code único para validação instantânea</li>
          <li>{CHECK} Recebida por e-mail assim que aprovada</li>
        </ul>
      </div>

      <p className="auth__marca-rodape">DCE ATITUS · Diretório Central Matheus Teixeira</p>
    </aside>
  );
}
