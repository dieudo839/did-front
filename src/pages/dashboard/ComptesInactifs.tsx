import { Link } from 'react-router-dom';

export function ComptesInactifs({
  count,
  loading = false,
  error,
  onRetry,
}: {
  count: number | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="inactive-accounts" aria-labelledby="inactive-accounts-title">
      <div>
        <h3 id="inactive-accounts-title">Comptes inactifs</h3>
        {loading ? (
          <span className="indicator-skeleton" aria-label="Chargement du nombre de comptes" />
        ) : error ? (
          <p className="dashboard-inline-error" role="alert">
            {error}
          </p>
        ) : (
          <p>
            {count ?? 0} compte{count === 1 ? '' : 's'} désactivé{count === 1 ? '' : 's'}.
          </p>
        )}
      </div>
      {error && onRetry ? (
        <button className="button" onClick={onRetry} type="button">
          Réessayer
        </button>
      ) : (
        <Link className="dashboard-panel-link" to="/utilisateurs">
          Voir les utilisateurs
        </Link>
      )}
    </section>
  );
}
