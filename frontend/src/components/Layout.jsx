import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoDce from './LogoDce';
import './Layout.css';

const ICONES = {
  carteira: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  ),
  perfil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0115 0" />
    </svg>
  ),
  pagamentos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2.5v19M16.5 6.8c-.7-1.4-2.3-2.3-4.5-2.3-2.6 0-4.4 1.3-4.4 3.2 0 4.6 9.2 2.6 9.2 7.3 0 2-1.9 3.4-4.8 3.4-2.4 0-4.2-1-4.9-2.5" />
    </svg>
  ),
  estudantes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5a6.2 6.2 0 0112.4 0M16 5.2a3.2 3.2 0 010 6M18 19.5a6.3 6.3 0 00-2.2-4.8" />
    </svg>
  ),
  sair: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 4.5h4a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-4M10 16l-4-4 4-4M6 12h10" />
    </svg>
  ),
};

const MENU_ESTUDANTE = [
  { para: '/carteirinha', rotulo: 'Carteira Digital', icone: 'carteira' },
  { para: '/perfil', rotulo: 'Meu Perfil', icone: 'perfil' },
];

const MENU_ADMIN = [
  { para: '/admin/pagamentos', rotulo: 'Pagamentos', icone: 'pagamentos' },
  { para: '/admin/estudantes', rotulo: 'Estudantes', icone: 'estudantes' },
];

export default function Layout() {
  const { usuario, ehAdmin, sair } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  // Trocar de página no celular precisa fechar a gaveta.
  useEffect(() => setMenuAberto(false), [local.pathname]);

  const itens = ehAdmin ? MENU_ADMIN : MENU_ESTUDANTE;

  function encerrarSessao() {
    sair();
    navegar('/', { replace: true });
  }

  return (
    <div className="layout">
      <header className="layout__topo-mobile">
        <button
          type="button"
          className="layout__hamburguer"
          onClick={() => setMenuAberto((v) => !v)}
          aria-expanded={menuAberto}
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
        >
          <span />
          <span />
          <span />
        </button>
        <LogoDce cor="verde" escala={0.5} />
      </header>

      {menuAberto && (
        <button
          type="button"
          className="layout__overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside className={`layout__sidebar ${menuAberto ? 'layout__sidebar--aberta' : ''}`}>
        <div className="layout__marca">
          <LogoDce cor="verde" escala={0.62} />
          <div className="layout__marca-texto">
            <strong>{ehAdmin ? 'Painel do DCE' : 'Área do Estudante'}</strong>
            <span>Carteirinha Digital</span>
          </div>
        </div>

        <nav className="layout__nav" aria-label="Menu principal">
          {itens.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              className={({ isActive }) => `layout__link ${isActive ? 'layout__link--ativo' : ''}`}
            >
              <span className="layout__icone">{ICONES[item.icone]}</span>
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="layout__rodape">
          <div className="layout__usuario">
            <div className="layout__avatar" aria-hidden="true">
              {usuario?.nome?.trim()?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="layout__usuario-texto">
              <strong title={usuario?.nome}>{usuario?.nome}</strong>
              <span title={usuario?.email}>{ehAdmin ? 'Administrador' : 'Estudante'}</span>
            </div>
          </div>
          <button type="button" className="layout__link layout__sair" onClick={encerrarSessao}>
            <span className="layout__icone">{ICONES.sair}</span>
            Sair
          </button>
        </div>
      </aside>

      <main className="layout__conteudo">
        <Outlet />
      </main>
    </div>
  );
}
