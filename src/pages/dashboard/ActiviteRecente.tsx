import { Link } from 'react-router-dom';
import { money } from '../../utils';
import type { DashboardActivity } from './types';

function relativeTime(value: string) {
  const elapsedMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  const relative = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  if (elapsedMinutes < 60) {
    return relative.format(-Math.max(elapsedMinutes, 0), 'minute');
  }
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return relative.format(-elapsedHours, 'hour');
  }
  return relative.format(-Math.round(elapsedHours / 24), 'day');
}

function OperationIcon({ type }: { type: DashboardActivity['type'] }) {
  return (
    <svg
      aria-hidden="true"
      className="activity-icon"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
    >
      {type === 'purchase' ? (
        <>
          <path d="M4 5h2l2 10h9l2-7H7" />
          <circle cx="10" cy="19" r="1" />
          <circle cx="17" cy="19" r="1" />
        </>
      ) : (
        <>
          <path d="m3 8 9-5 9 5v10l-9 5-9-5z" />
          <path d="m3 8 9 5 9-5M12 13v10" />
        </>
      )}
    </svg>
  );
}

export function ActiviteRecente({
  activities,
  loading = false,
  error,
  partialError,
  onRetry,
  audience,
}: {
  activities: DashboardActivity[];
  loading?: boolean;
  error?: string;
  partialError?: string;
  onRetry?: () => void;
  audience: 'team' | 'personal';
}) {
  return (
    <section className="dashboard-panel activity-panel" aria-labelledby="activity-title">
      <div className="dashboard-panel-heading">
        <div>
          <h3 id="activity-title">Activité récente</h3>
          <p>Achats et livraisons enregistrés</p>
        </div>
      </div>
      <p className="activity-scope">
        {audience === 'team' ? 'Opérations de toute l’équipe' : 'Vos opérations uniquement'}
      </p>
      {loading ? (
        <div className="activity-skeleton" aria-label="Chargement de l’activité" role="status">
          {Array.from({ length: 5 }, (_, index) => (
            <span className="dashboard-skeleton-row" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="dashboard-block-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button className="button" onClick={onRetry} type="button">
              Réessayer
            </button>
          )}
        </div>
      ) : activities.length === 0 ? (
        <>
          {partialError && (
            <div className="dashboard-partial-error" role="status">
              <p>{partialError}</p>
              {onRetry && (
                <button className="button" onClick={onRetry} type="button">
                  Réessayer
                </button>
              )}
            </div>
          )}
          <p className="dashboard-empty">Aucune activité enregistrée.</p>
        </>
      ) : (
        <>
          {partialError && (
            <div className="dashboard-partial-error" role="status">
              <p>{partialError}</p>
              {onRetry && (
                <button className="button" onClick={onRetry} type="button">
                  Réessayer
                </button>
              )}
            </div>
          )}
          <ol className="activity-list">
            {activities.slice(0, 5).map((activity) => (
              <li key={activity.id}>
                <OperationIcon type={activity.type} />
                <span className="activity-description">
                  <span>{activity.label}</span>
                  <span className="activity-operator">
                    Créé par {activity.creerPar || 'system'}
                  </span>
                  <time dateTime={activity.date}>{relativeTime(activity.date)}</time>
                </span>
                {activity.total !== null && (
                  <strong className="amount">{money(activity.total)}</strong>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      <Link className="dashboard-panel-link" to="/ventes">
        Voir l’historique
      </Link>
    </section>
  );
}
