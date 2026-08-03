import './CarteirinhaVisual.css';

const NIVEIS = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-Graduação',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
  tecnico: 'Técnico',
};

function formatarData(valor) {
  if (!valor) return '--';
  const d = new Date(typeof valor === 'string' && valor.length === 10 ? `${valor}T00:00:00Z` : valor);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

function classeNome(nome = '') {
  if (nome.length > 34) return 'cv__nome cv__nome--xs';
  if (nome.length > 24) return 'cv__nome cv__nome--sm';
  return 'cv__nome';
}

function Campo({ rotulo, children }) {
  return (
    <div className="cv__campo">
      <span className="cv__chip">{rotulo}:</span>
      <span className="cv__valor">{children}</span>
    </div>
  );
}

/**
 * Prévia da frente da carteirinha, com o mesmo layout que o Puppeteer imprime.
 * Escala pela largura do contêiner (unidades cqw), então serve tanto no
 * desktop quanto no celular sem media query.
 *
 * Precisa acompanhar `backend/src/services/carteirinha-template.js`. Se os dois
 * divergirem, o aluno vê uma carteirinha no site e recebe outra por e-mail —
 * foi o que aconteceu quando o template mudou e este componente ficou para trás.
 *
 * Depois de aprovada usamos o PNG gerado pelo backend, não este componente —
 * assim o que o aluno baixa é exatamente o documento oficial.
 */
export default function CarteirinhaVisual({ estudante, dataEmissao, codigoUso }) {
  const ano = dataEmissao ? new Date(dataEmissao).getUTCFullYear() : new Date().getUTCFullYear();
  const instituicao = (estudante?.instituicao ?? 'ATITUS').toUpperCase();

  return (
    <div className="cv-container">
      <div className="cv">
        <svg className="cv__swoosh" viewBox="0 0 560 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M446 -70 C250 60, 205 236, 372 322 C548 412, 512 556, 300 660 C214 702, 176 742, 172 800" />
        </svg>

        <span className="cv__logo" aria-label="DCE ATITUS">
          <span className="cv__logo-sigla">DCE</span>
          <span className="cv__logo-regua" />
          <span className="cv__logo-inst">ATITUS</span>
        </span>

        <div className="cv__corpo">
          <div className={classeNome(estudante?.nome)}>{(estudante?.nome ?? '--').toUpperCase()}</div>

          <div className="cv__linha">
            {estudante?.fotoUrl ? (
              <img className="cv__foto" src={estudante.fotoUrl} alt="" />
            ) : (
              <div className="cv__foto cv__foto--vazia">sem foto</div>
            )}

            <div className="cv__campos">
              <Campo rotulo="Instituição">{instituicao}</Campo>
              <Campo rotulo="Grau">{NIVEIS[estudante?.nivel] ?? estudante?.nivelRotulo ?? '--'}</Campo>
              <Campo rotulo="Curso">{(estudante?.curso ?? '--').toUpperCase()}</Campo>
              <Campo rotulo="Data de nascimento">{formatarData(estudante?.dataNascimento)}</Campo>
              {estudante?.documentoNumero ? (
                <Campo rotulo={estudante.documentoRotulo ?? 'Documento'}>
                  {estudante.documentoNumero}
                  {estudante.documentoEmissor ? ` ${estudante.documentoEmissor}` : ''}
                </Campo>
              ) : null}
              <Campo rotulo="CPF">{estudante?.cpfFormatado ?? '--'}</Campo>
              <Campo rotulo="Matrícula">{estudante?.matricula ?? '--'}</Campo>
            </div>
          </div>
        </div>

        <div className="cv__painel">
          <div className="cv__painel-qr">
            <div className="cv__qr">
              QR liberado
              <br />
              após a aprovação
            </div>
            <div className="cv__codigo-rotulo">Cód. de uso</div>
            <div className="cv__codigo-valor">{codigoUso ?? '— — —'}</div>
          </div>

          <div className="cv__painel-ano">
            <div className="cv__painel-inst">{instituicao}</div>
            <div className="cv__painel-numero">{ano}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
