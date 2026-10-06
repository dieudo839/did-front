import { Link } from 'react-router-dom';
import type { DashboardPeriod } from './types';

const periods: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7days', label: '7 jours' },
  { value: '30days', label: '30 jours' },
  { value: 'month', label: 'Ce mois' },
];

export function EnteteDePage({
  dateLabel,
  onRefresh,
  refreshing,
  lastUpdated,
}: {
  dateLabel: string;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: string;
}) {
  return (
    <header className="dashboard-page-header">
      <div className="dashboard-page-title-row">
        <div>
          <h1>Tableau de bord</h1>
          <p>{dateLabel}</p>
        </div>
        <div className="dashboard-header-actions">
          <div className="refresh-control">
            <button className="button" disabled={refreshing} onClick={onRefresh} type="button">
              {refreshing ? 'Actualisation…' : 'Actualiser'}
            </button>
            <span aria-live="polite">Mis à jour à {lastUpdated}</span>
          </div>
          <Link className="button primary" to="/caisse">
            Nouvelle vente
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SelecteurPeriode({
  period,
  onChange,
  showDetailedPerformance,
}: {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  showDetailedPerformance: boolean;
}) {
  return (
    <div className="performance-controls">
      <div className="performance-controls-copy">
        <strong>Période des performances</strong>
        <span>
          {showDetailedPerformance
            ? 'Indicateurs, évolution du chiffre d’affaires et produits les plus vendus'
            : 'Indicateurs et chiffres de vente'}
        </span>
      </div>
      <div className="period-tabs" role="group" aria-label="Période des performances">
        {periods.map((item) => (
          <button
            aria-pressed={period === item.value}
            className={period === item.value ? 'period-active' : ''}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
