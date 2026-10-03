import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DataTable, EmptyState, ErrorState, LoadingState, Tag } from '../components/ui';
import { Heading } from '../components/layout';
import type { Purchase } from '../types';
import { money } from '../utils';

const chartWidth = 640;
const chartHeight = 240;
const chartPadding = { top: 24, right: 20, bottom: 42, left: 76 };

function dateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function recentDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
}

async function recentPurchases(startDate: string, endDate: string) {
  const filters = { dateDebut: startDate, dateFin: endDate };
  const firstPage = await api.purchases(0, filters);
  const purchases = [...firstPage.content];

  for (let page = 1; page < firstPage.totalPages; page += 5) {
    const pageNumbers = Array.from(
      { length: Math.min(5, firstPage.totalPages - page) },
      (_, index) => page + index,
    );
    const nextPages = await Promise.all(
      pageNumbers.map((number) => api.purchases(number, filters)),
    );
    nextPages.forEach((result) => purchases.push(...result.content));
  }

  return purchases;
}

function RevenueChart({ purchases, dates }: { purchases: Purchase[]; dates: Date[] }) {
  const totals = useMemo(() => {
    const result = new Map(dates.map((date) => [dateOnly(date), 0]));
    purchases.forEach((purchase) => {
      const day = purchase.dateAchat.slice(0, 10);
      if (result.has(day)) {
        result.set(day, (result.get(day) || 0) + purchase.total);
      }
    });
    return dates.map((date) => ({ date, total: result.get(dateOnly(date)) || 0 }));
  }, [dates, purchases]);
  const maxValue = Math.max(...totals.map((entry) => entry.total), 1);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const points = totals.map((entry, index) => ({
    x: chartPadding.left + (plotWidth * index) / Math.max(totals.length - 1, 1),
    y: chartPadding.top + plotHeight - (entry.total / maxValue) * plotHeight,
    ...entry,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const formatter = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const totalPeriod = totals.reduce((sum, entry) => sum + entry.total, 0);

  return (
    <section className="dashboard-chart" aria-labelledby="revenue-chart-title">
      <div className="dashboard-section-heading">
        <div>
          <p className="eyebrow">Activité récente</p>
          <h2 id="revenue-chart-title">Chiffre d’affaires · 7 jours</h2>
        </div>
        <strong className="dashboard-chart-total">{money(totalPeriod)}</strong>
      </div>
      <div className="chart-wrap">
        <svg
          className="revenue-chart"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          aria-labelledby="revenue-chart-title revenue-chart-description"
        >
          <desc id="revenue-chart-description">
            Chiffre d’affaires quotidien calculé à partir des ventes enregistrées.
          </desc>
          {[0, 0.5, 1].map((fraction) => {
            const y = chartPadding.top + plotHeight * fraction;
            const value = maxValue * (1 - fraction);
            return (
              <g className="chart-axis" key={fraction}>
                <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} />
                <text x={chartPadding.left - 12} y={y + 4} textAnchor="end">
                  {formatter.format(value)}
                </text>
              </g>
            );
          })}
          <path className="chart-line" d={path} />
          {points.map((point) => (
            <g key={dateOnly(point.date)}>
              <circle
                className={
                  dateOnly(point.date) === dateOnly(new Date())
                    ? 'chart-point-current'
                    : 'chart-point'
                }
                cx={point.x}
                cy={point.y}
                r="4"
              />
              <text className="chart-date" x={point.x} y={chartHeight - 12} textAnchor="middle">
                {point.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const dates = useMemo(recentDates, []);
  const dateFrom = dateOnly(dates[0]);
  const dateTo = dateOnly(dates[dates.length - 1]);
  const today = useQuery({ queryKey: ['revenue', 'jour'], queryFn: () => api.revenue('jour') });
  const month = useQuery({ queryKey: ['revenue', 'mois'], queryFn: () => api.revenue('mois') });
  const top = useQuery({ queryKey: ['top-products'], queryFn: () => api.topProducts(5) });
  const stock = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => api.products(0, '', 100, true),
  });
  const sales = useQuery({
    queryKey: ['dashboard-sales', dateFrom, dateTo],
    queryFn: () => recentPurchases(dateFrom, dateTo),
  });
  const lowStock = stock.data?.content.filter((item) => item.stockActuel <= item.seuilAlerte) || [];

  return (
    <>
      <Heading
        kicker="Synthèse"
        title="Tableau de bord"
        aside={
          <Link className="button primary" to="/caisse">
            Nouvelle vente
          </Link>
        }
      />

      <section className="dashboard-stats" aria-label="Indicateurs clés">
        <div className="dashboard-stat">
          <span>Aujourd’hui</span>
          {today.isLoading ? (
            <LoadingState label="Calcul…" />
          ) : today.error ? (
            <ErrorState error={today.error} />
          ) : (
            <strong>{money(today.data?.chiffreAffaires || 0)}</strong>
          )}
          <small>Chiffre d’affaires</small>
        </div>
        <div className="dashboard-stat">
          <span>Ce mois</span>
          {month.isLoading ? (
            <LoadingState label="Calcul…" />
          ) : month.error ? (
            <ErrorState error={month.error} />
          ) : (
            <strong>{money(month.data?.chiffreAffaires || 0)}</strong>
          )}
          <small>Chiffre d’affaires</small>
        </div>
        <div className="dashboard-stat">
          <span>Stock bas</span>
          {stock.isLoading ? (
            <LoadingState label="Calcul…" />
          ) : stock.error ? (
            <ErrorState error={stock.error} />
          ) : (
            <strong>{stock.data?.totalElements || 0}</strong>
          )}
          <small>Produits à réapprovisionner</small>
        </div>
      </section>

      {sales.isLoading ? (
        <section className="dashboard-chart">
          <h2>Chiffre d’affaires · 7 jours</h2>
          <LoadingState label="Chargement des ventes…" />
        </section>
      ) : sales.error ? (
        <section className="dashboard-chart">
          <h2>Chiffre d’affaires · 7 jours</h2>
          <ErrorState error={sales.error} />
        </section>
      ) : (
        <RevenueChart purchases={sales.data || []} dates={dates} />
      )}

      <div className="dashboard-columns">
        <section className="section-block">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">Performance</p>
              <h2>Produits les plus vendus</h2>
            </div>
          </div>
          {top.isLoading ? (
            <LoadingState label="Chargement des produits…" />
          ) : top.error ? (
            <ErrorState error={top.error} />
          ) : (
            <DataTable
              headers={['PRODUIT', 'QUANTITÉ', 'VENTES']}
              empty="Aucune vente enregistrée."
            >
              {top.data?.map((product) => (
                <tr key={product.produitId}>
                  <td>{product.produit}</td>
                  <td className="right amount">{product.quantiteVendue}</td>
                  <td className="right amount">{money(product.chiffreAffaires)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>

        <section className="section-block stock-watch">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">À surveiller</p>
              <h2>Stock bas</h2>
            </div>
            <Link to="/produits">Voir les produits</Link>
          </div>
          {stock.isLoading ? (
            <LoadingState label="Chargement du stock…" />
          ) : stock.error ? (
            <ErrorState error={stock.error} />
          ) : lowStock.length === 0 ? (
            <EmptyState>Aucun produit sous son seuil d’alerte.</EmptyState>
          ) : (
            <ul className="stock-list">
              {lowStock.slice(0, 6).map((product) => (
                <li key={product.id}>
                  <span>{product.nom}</span>
                  <Tag warning>
                    {product.stockActuel} / seuil {product.seuilAlerte}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
