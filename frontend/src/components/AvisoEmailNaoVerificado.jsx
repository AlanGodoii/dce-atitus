import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Aparece na área do estudante enquanto o e-mail não foi confirmado. Não é só
 * cosmético: o backend recusa `informar-pagamento` nesse estado, então o aluno
 * precisa saber por que o botão não vai adiante.
 */
export default function AvisoEmailNaoVerificado() {
  const { usuario, ehAdmin } = useAuth();

  if (ehAdmin || !usuario || usuario.emailVerificado) return null;

  return (
    <div className="aviso aviso-atencao" role="status">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        style={{ flexShrink: 0, marginTop: 1 }}
        aria-hidden="true"
      >
        <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
        <path d="M3 6l9 7 9-7" />
      </svg>
      <div>
        <strong>Confirme seu e-mail para solicitar a carteirinha.</strong>
        <br />
        Enviamos um link e um código para <strong>{usuario.email}</strong>. É para esse endereço que
        a carteirinha será enviada quando ficar pronta.
        <br />
        <strong>Não achou?</strong> Verifique a caixa de spam ou lixo eletrônico — nossos e-mails
        às vezes param lá.{' '}
        <Link
          to={`/verificar-email?email=${encodeURIComponent(usuario.email)}`}
          style={{ fontWeight: 600, textDecoration: 'underline' }}
        >
          Confirmar agora
        </Link>
      </div>
    </div>
  );
}
