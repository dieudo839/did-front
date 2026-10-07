import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import type { Session } from '../types';

const navigation = [
  ['/', 'Tableau de bord'],
  ['/produits', 'Produits'],
  ['/caisse', 'Caisse'],
  ['/clients', 'Clients'],
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
            <>
              <Link
                to="/categories"
                className={location.pathname === '/categories' ? 'active' : ''}
                onClick={closeMenu}
              >
                Catégories
              </Link>
              <Link
                to="/utilisateurs"
                className={location.pathname === '/utilisateurs' ? 'active' : ''}
                onClick={closeMenu}
              >
                Utilisateurs
              </Link>
              <Link
                to="/journaux"
                className={location.pathname === '/journaux' ? 'active' : ''}
                onClick={closeMenu}
              >
                Journal d’audit
              </Link>
            </>
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
          <Link className="identity-link" to="/profil" onClick={closeMenu}>
            <span className="identity-avatar" aria-hidden="true">
              {`${session.utilisateur.prenom.charAt(0)}${session.utilisateur.nom.charAt(0)}`.toLocaleUpperCase(
                'fr-FR',
              )}
            </span>
            <span className="identity-copy">
              <span className="identity-name">
                {session.utilisateur.prenom} {session.utilisateur.nom}
              </span>
              <small>
                {session.utilisateur.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'} · @
                {session.utilisateur.identifiant}
              </small>
            </span>
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

  const visiblePages = new Set([0, pages - 1, page - 1, page, page + 1]);
  const pageNumbers = [...visiblePages]
    .filter((number) => number >= 0 && number < pages)
    .sort((first, second) => first - second);
  const items: Array<number | 'ellipsis'> = [];
  pageNumbers.forEach((number, index) => {
    if (index > 0 && number - pageNumbers[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(number);
  });

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
      <div className="pager-pages" aria-label="Pages">
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span className="pager-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item + 1}`}
              className={`pager-page ${item === page ? 'pager-page-active' : ''}`}
              key={item}
              onClick={() => setPage(item)}
              type="button"
            >
              {item + 1}
            </button>
          ),
        )}
      </div>
      <span className="pager-count mono" aria-live="polite">
        Page {page + 1} sur {pages}
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
