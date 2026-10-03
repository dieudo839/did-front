import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import type { Session } from '../types';

const navigation = [
  ['/', 'Tableau de bord'],
  ['/produits', 'Produits'],
  ['/caisse', 'Caisse'],
  ['/arrivages', 'Livraisons'],
  ['/ventes', 'Historique'],
];

export function Shell({
  session,
  onLogout,
  children,
}: {
  session: Session;
  onLogout: () => void;
  children: ReactNode;
}) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app">
      <button
        className="menu-trigger"
        type="button"
        aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <Icon name={menuOpen ? 'close' : 'menu'} />
      </button>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fermer le menu"
          onClick={closeMenu}
        />
      )}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <Link to="/" className="brand" aria-label="Gestion boutique, accueil" onClick={closeMenu}>
          Gestion boutique
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              to={href}
              className={location.pathname === href ? 'active' : ''}
              aria-current={location.pathname === href ? 'page' : undefined}
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}
          {session.utilisateur.role === 'ADMIN' && (
            <Link
              to="/utilisateurs"
              className={location.pathname === '/utilisateurs' ? 'active' : ''}
              onClick={closeMenu}
            >
              Utilisateurs
            </Link>
          )}
          <Link
            to="/profil"
            className={location.pathname === '/profil' ? 'active' : ''}
            onClick={closeMenu}
          >
            Profil
          </Link>
        </nav>
        <div className="identity">
          <Link to="/profil" onClick={closeMenu}>
            <span className="identity-name">
              {session.utilisateur.prenom} {session.utilisateur.nom}
            </span>
            <small>{session.utilisateur.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'}</small>
          </Link>
          <button onClick={onLogout} className="logout" type="button">
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function Heading({
  kicker,
  title,
  aside,
}: {
  kicker: string;
  title: string;
  aside?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="page-heading-copy">
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
      </div>
      {aside && <div className="page-heading-actions">{aside}</div>}
    </div>
  );
}

export function Pager({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  if (pages <= 1) {
    return null;
  }

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="button"
        type="button"
        disabled={page === 0}
        onClick={() => setPage(page - 1)}
      >
        Précédent
      </button>
      <span className="mono" aria-live="polite">
        {page + 1} / {pages}
      </span>
      <button
        className="button"
        type="button"
        disabled={page + 1 >= pages}
        onClick={() => setPage(page + 1)}
      >
        Suivant
      </button>
    </nav>
  );
}
