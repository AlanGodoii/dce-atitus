import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Carregando from './Carregando';

/**
 * Bloqueia rotas que exigem sessão. Com `apenasAdmin`, também barra estudante.
 * Guarda a rota tentada em state.de para o login devolver o usuário ao destino.
 */
export default function RotaProtegida({ children, apenasAdmin = false }) {
  const { autenticado, ehAdmin, usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <Carregando texto="Verificando sua sessão..." />;

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  // Estudante sem e-mail confirmado não entra na área logada: a API recusaria
  // todas as chamadas de perfil/carteirinha de qualquer jeito (403).
  // `aviso=bloqueado` faz a tela de confirmação abrir com a notificação de que
  // o acesso está travado por isso.
  if (!ehAdmin && !usuario?.emailVerificado) {
    return (
      <Navigate
        to={`/verificar-email?email=${encodeURIComponent(usuario?.email ?? '')}&aviso=bloqueado`}
        replace
      />
    );
  }

  if (apenasAdmin && !ehAdmin) {
    return <Navigate to="/carteirinha" replace />;
  }

  return children;
}
