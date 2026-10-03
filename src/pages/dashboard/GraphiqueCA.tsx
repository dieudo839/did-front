import { money } from '../../utils';
import type { DayTotal, DashboardPeriod } from './types';

const width = 720;
const height = 280;
const padding = { top: 24, right: 16, bottom: 44, left: 88 };

function shortDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function axisMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function axisIndexes(length: number) {
  if (length <= 4) {
    return Array.from({ length }, (_, index) => index);
  }
  return [0, Math.round((length - 1) / 3), Math.round(((length - 1) * 2) / 3), length - 1];
}

function toPath(values: DayTotal[], max: number, plotWidth: number, plotHeight: number) {
  const points = values.map((entry, index) => ({
    x: padding.left + (plotWidth * index) / Math.max(values.length - 1, 1),
    y: padding.top + plotHeight - (entry.total / Math.max(max, 1)) * plotHeight,
    ...entry,
  }));
  const path = points.reduce((result, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = points[index - 1]!;
    const distance = point.x - previous.x;
    const firstControl = previous.x + distance / 3;
    const secondControl = previous.x + (distance * 2) / 3;
    return `${result} C ${firstControl} ${previous.y}, ${secondControl} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  return { points, path };
}

export function GraphiqueCA({
  values,
  periodLabel,
  loading = false,
  error,
  onRetry,
}: {
  values: DayTotal[];
  periodLabel: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const total = values.reduce((sum, entry) => sum + entry.total, 0);
  const max = Math.max(...values.map((entry) => entry.total), 0);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const { points, path } = toPath(values, max, plotWidth, plotHeight);
  const indexes = axisIndexes(values.length);

  return (
    <section className="dashboard-panel revenue-panel" aria-labelledby="revenue-title">
      <div className="dashboard-panel-heading">
        <div>
          <h3 id="revenue-title">Évolution du chiffre d’affaires</h3>
          <p>{periodLabel}</p>
        </div>
        <strong className="amount">{money(total)}</strong>
      </div>
      {loading ? (
        <div className="chart-skeleton" aria-label="Chargement du graphique" role="status" />
      ) : error ? (
        <div className="dashboard-block-error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button className="button" onClick={onRetry} type="button">
              Réessayer
            </button>
          )}
        </div>
      ) : values.length === 0 ? (
        <p className="dashboard-empty">Aucune vente sur cette période.</p>
      ) : (
        <>
          <div className="dashboard-chart-svg-wrap">
            <svg
              aria-label={`Graphique du chiffre d’affaires ${periodLabel}, total ${money(total)}`}
              className="dashboard-line-chart"
              role="group"
              viewBox={`0 0 ${width} ${height}`}
            >
              <title>Évolution du chiffre d’affaires</title>
              <desc>
                Courbe quotidienne de chiffre d’affaires. Les montants sont accessibles dans le
                tableau qui suit.
              </desc>
              {[0, 1, 2, 3].map((step) => {
                const fraction = step / 3;
                const y = padding.top + plotHeight * fraction;
                const axisValue = max * (1 - fraction);
                return (
                  <g className="dashboard-chart-axis" key={step}>
                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                    <text x={padding.left - 12} y={y + 4} textAnchor="end">
                      {axisMoney(axisValue)}
                    </text>
                  </g>
                );
              })}
              <path className="dashboard-evolution-line" d={path} />
              {points.map((point, index) => (
                <g key={point.date}>
                  <circle
                    aria-label={`${shortDate(point.date)} · ${money(point.total)} · ${point.count} achats`}
                    className={
                      index === points.length - 1
                        ? 'dashboard-evolution-point-current'
                        : 'dashboard-evolution-point'
                    }
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    role="img"
                    tabIndex={0}
                  >
                    <title>{`${shortDate(point.date)} · ${money(point.total)} · ${point.count} achats`}</title>
                  </circle>
                  {indexes.includes(index) && (
                    <text className="dashboard-chart-date" x={point.x} y={height - 12}>
                      {shortDate(point.date)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          <p className="visually-hidden">Détail du chiffre d’affaires par jour :</p>
          <table className="visually-hidden">
            <caption>Détail des ventes pour {periodLabel}</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Chiffre d’affaires</th>
                <th>Nombre d’achats</th>
              </tr>
            </thead>
            <tbody>
              {values.map((entry) => (
                <tr key={entry.date}>
                  <td>{shortDate(entry.date)}</td>
                  <td>{money(entry.total)}</td>
                  <td>{entry.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export function rangeDescription(period: DashboardPeriod) {
  return period === 'today'
    ? 'Aujourd’hui'
    : period === '7days'
      ? '7 derniers jours'
      : period === '30days'
        ? '30 derniers jours'
        : 'Ce mois';
}
