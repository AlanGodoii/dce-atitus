import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Carregando from '../components/Carregando';

/**
 * Recebe o token que o backend anexa na URL depois do OAuth do Google,
 * guarda a sessão e limpa a URL para o token não ficar no histórico.
 */
export default function AuthCallback() {
  const [params] = useSearchParams();
  const { entrarComToken } = useAuth();
  const navegar = useNavigate();
  const [erro, setErro] = useState('');
  const jaProcessou = useRef(false);

  useEffect(() => {
    if (jaProcessou.current) return;
    jaProcessou.current = true;

    const token = params.get('token');
    if (!token) {
      navegar('/login?erro=Login%20com%20Google%20falhou.', { replace: true });
      return;
    }

    entrarComToken(token)
      .then((usuario) => {
        if (!usuario) {
          setErro('Não foi possível carregar sua sessão.');
          return;
        }
        navegar(usuario.role === 'admin' ? '/admin/pagamentos' : '/carteirinha', { replace: true });
      })
      .catch(() => setErro('Não foi possível carregar sua sessão.'));
  }, [params, entrarComToken, navegar]);

  if (erro) {
    return (
      <div className="container" style={{ padding: '80px 24px', maxWidth: 520 }}>
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
        <button type="button" className="btn btn-primario" onClick={() => navegar('/login')}>
          Voltar para o login
        </button>
      </div>
    );
  }

  return <Carregando texto="Entrando com o Google..." />;
}
