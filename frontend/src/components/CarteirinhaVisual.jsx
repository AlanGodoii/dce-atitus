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

function validadePadrao() {
  return new Date(Date.UTC(new Date().getUTCFullYear() + 1, 2, 31));
}

function classeNome(nome = '') {
  if (nome.length > 34) return 'cv__nome cv__nome--xs';
  if (nome.length > 24) return 'cv__nome cv__nome--sm';
  return 'cv__nome';
}

/**
 * Prévia da frente da carteirinha, com o mesmo layout que o Puppeteer imprime.
 * Escala pela largura do contêiner (unidades cqw), então serve tanto no
 * desktop quanto no celular sem media query.
 *
 * Depois de aprovada usamos o PNG gerado pelo backend, não este componente —
 * assim o que o aluno baixa é exatamente o documento oficial.
 */
export default function CarteirinhaVisual({ estudante, dataEmissao, dataValidade }) {
  const ano = dataEmissao ? new Date(dataEmissao).getUTCFullYear() : new Date().getUTCFullYear();
  const validade = dataValidade ?? validadePadrao();

  return (
    <div className="cv-container">
      <div className="cv">
        <svg className="cv__tracos cv__tracos--topo" viewBox="0 0 300 150" preserveAspectRatio="none" aria-hidden="true">
          <path d="M40 -20 L300 130 M300 -20 L40 130 M170 -20 L300 55" />
        </svg>

        <div className="cv__topo">
          <span className="cv__logo" aria-label="DCE ATITUS">
            <span className="cv__logo-sigla">DCE</span>
            <span className="cv__logo-regua" />
            <span className="cv__logo-inst">ATITUS</span>
          </span>
          <span className="cv__titulo">Carteira de Identificação Estudantil</span>
        </div>

        <div className="cv__miolo">
          {estudante?.fotoUrl ? (
            <img className="cv__foto" src={estudante.fotoUrl} alt="" />
          ) : (
            <div className="cv__foto cv__foto--vazia">sem foto</div>
          )}

          <div className="cv__dados">
            <div className={classeNome(estudante?.nome)}>{(estudante?.nome ?? '--').toUpperCase()}</div>
            <div className="cv__campo">CPF: {estudante?.cpfFormatado ?? '--'}</div>
            <div className="cv__campo">Data Nasc.: {formatarData(estudante?.dataNascimento)}</div>
            <div className="cv__campo">Matrícula: {estudante?.matricula ?? '--'}</div>
            <div className="cv__campo">
              Curso: <strong>{(estudante?.curso ?? '--').toUpperCase()}</strong>
            </div>
            <div className="cv__campo">
              Nível: <strong>{NIVEIS[estudante?.nivel] ?? estudante?.nivelRotulo ?? '--'}</strong>
            </div>
            <div className="cv__campo">
              Instituição: <strong>{(estudante?.instituicao ?? 'ATITUS').toUpperCase()}</strong>
            </div>
          </div>

          <div className="cv__qr">
            QR liberado
            <br />
            após a aprovação
          </div>
        </div>

        <svg className="cv__tracos cv__tracos--rodape" viewBox="0 0 340 110" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 120 L110 10 L220 120 M120 120 L230 10 L340 120" />
        </svg>

        <div className="cv__rodape">
          <span className="cv__ano">{ano}</span>
          <span className="cv__divisor" />
          <span className="cv__validade">Válida até {formatarData(validade)}</span>
        </div>
      </div>
    </div>
  );
}
