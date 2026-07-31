import './LogoDce.css';

/**
 * Wordmark do DCE ATITUS reproduzido em CSS. Mesmo desenho da arte oficial
 * (DCE pesado, régua, ATITUS espaçado) e escala sem perder nitidez.
 *
 * @param {'verde'|'branco'} cor
 * @param {number} escala  1 = ~58px de altura
 */
export default function LogoDce({ cor = 'verde', escala = 1, className = '' }) {
  return (
    <span
      className={`logo-dce logo-dce--${cor} ${className}`}
      style={{ '--escala': escala }}
      role="img"
      aria-label="DCE ATITUS"
    >
      <span className="logo-dce__sigla" aria-hidden="true">
        DCE
      </span>
      <span className="logo-dce__regua" aria-hidden="true" />
      <span className="logo-dce__instituicao" aria-hidden="true">
        ATITUS
      </span>
    </span>
  );
}
