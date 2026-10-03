import { Link } from 'react-router-dom';
import type { DashboardPeriod } from './types';

const periods: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Aujourd’hui' },
  { value: '7days', label: '7 jours' },
  { value: '30days', label: '30 jours' },
  { value: 'month', label: 'Ce mois' },
];

export function EnteteDePage({
  dateLabel,
  period,
  onPeriodChange,
  onRefresh,
  refreshing,
  lastUpdated,
}: {
  dateLabel: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
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
        <Link className="button primary" to="/caisse">
          Nouvelle vente
        </Link>
      </div>
      <div className="dashboard-toolbar">
        <div className="period-tabs" role="group" aria-label="Période de performance">
          {periods.map((item) => (
            <button
              aria-pressed={period === item.value}
              className={period === item.value ? 'period-active' : ''}
              key={item.value}
              onClick={() => onPeriodChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="refresh-control">
          <button className="button" disabled={refreshing} onClick={onRefresh} type="button">
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
          <span aria-live="polite">Mis à jour à {lastUpdated}</span>
        </div>
      </div>
    </header>
  );
}
