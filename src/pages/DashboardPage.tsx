import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError, readSession } from '../api/client';
import { ActiviteRecente } from './dashboard/ActiviteRecente';
import { ClassementProduits } from './dashboard/ClassementProduits';
import { ComptesInactifs } from './dashboard/ComptesInactifs';
import { EnteteDePage, SelecteurPeriode } from './dashboard/EnteteDePage';
import { GraphiqueCA, rangeDescription } from './dashboard/GraphiqueCA';
import { IndicateurCle } from './dashboard/IndicateurCle';
import { ListeAlertesStock } from './dashboard/ListeAlertesStock';
import { SectionTitre } from './dashboard/SectionTitre';
import {
  countItems,
  rankProducts,
  sumPurchases,
  toActivity,
  toDayTotals,
  type DashboardPeriod,
  type DateRange,
} from './dashboard/types';

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

function dateRange(start: Date, end: Date): DateRange {
  return { start: formatDate(start), end: formatDate(end) };
}

function getRanges(period: DashboardPeriod, today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (period === 'today') {
    start = end;
    previousEnd = new Date(end);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousStart = new Date(previousEnd);
  } else if (period === '7days' || period === '30days') {
    const days = period === '7days' ? 7 : 30;
    start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - days + 1);
  } else {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
    previousStart = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    previousEnd = new Date(
      end.getFullYear(),
      end.getMonth() - 1,
      Math.min(end.getDate(), new Date(end.getFullYear(), end.getMonth(), 0).getDate()),
    );
  }

  return {
    current: dateRange(start, end),
    previous: dateRange(previousStart, previousEnd),
  };
}

function inclusiveDates(range: DateRange) {
  const start = parseDate(range.start);
  const end = parseDate(range.end);
  const dates: string[] = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(formatDate(date));
  }
  return dates;
}

async function fetchAllPurchases(range: DateRange) {
  const filters = { dateDebut: range.start, dateFin: range.end };
  const first = await api.purchases(0, filters);
  const purchases = [...first.content];

  for (let firstPage = 1; firstPage < first.page.totalPages; firstPage += 5) {
    const pages = Array.from(
      { length: Math.min(5, first.page.totalPages - firstPage) },
      (_, index) => firstPage + index,
    );
    const results = await Promise.all(pages.map((page) => api.purchases(page, filters)));
    results.forEach((result) => purchases.push(...result.content));
  }

  return purchases;
}

async function fetchInactiveUsers() {
  const first = await api.users(0);
  const users = [...first.content];
  for (let firstPage = 1; firstPage < first.page.totalPages; firstPage += 5) {
    const pages = Array.from(
      { length: Math.min(5, first.page.totalPages - firstPage) },
      (_, index) => firstPage + index,
    );
    const results = await Promise.all(pages.map((page) => api.users(page)));
    results.forEach((result) => users.push(...result.content));
  }
  return users.filter((user) => !user.actif).length;
}

function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function formatError(error: unknown) {
  if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
    return 'Donnée indisponible : route backend manquante';
  }
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

function longDate(date: Date) {
  const value = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date);
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
}

function lastUpdatedLabel(timestamps: number[]) {
  const timestamp = Math.max(...timestamps);
  return timestamp
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
    : '—';
}

function SectionIcon({ type }: { type: 'performance' | 'attention' }) {
  return type === 'performance' ? (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7" />
    </svg>
  ) : (
    <span className="attention-dot" />
  );
}

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('7days');
  const queryClient = useQueryClient();
  const isAdmin = readSession()?.utilisateur.role === 'ADMIN';
  const ranges = useMemo(() => getRanges(period), [period]);
  const currentDates = useMemo(() => inclusiveDates(ranges.current), [ranges.current]);
  const current = useQuery({
    queryKey: ['dashboard', 'performance', ranges.current],
    queryFn: () => fetchAllPurchases(ranges.current),
  });
  const previous = useQuery({
    queryKey: ['dashboard', 'comparison', ranges.previous],
    queryFn: () => fetchAllPurchases(ranges.previous),
  });
  const revenue = useQuery({
    queryKey: ['dashboard', 'revenue', period],
    queryFn: () => api.revenue(period === 'today' ? 'jour' : 'mois'),
    enabled: period === 'today' || period === 'month',
  });
  const stock = useQuery({
    queryKey: ['dashboard', 'stock'],
    queryFn: () => api.products(0, '', 100, true),
  });
  const recentPurchases = useQuery({
    queryKey: ['dashboard', 'recent-purchases'],
    queryFn: () => api.purchases(0, {}),
  });
  const recentDeliveries = useQuery({
    queryKey: ['dashboard', 'recent-deliveries'],
    queryFn: () => api.deliveries(0, {}),
  });
  const inactive = useQuery({
    queryKey: ['dashboard', 'inactive-users'],
    queryFn: fetchInactiveUsers,
    enabled: isAdmin,
  });

  const currentPurchases = current.data || [];
  const previousPurchases = previous.data || [];
  const salesTotal = sumPurchases(currentPurchases);
  const usesRevenueEndpoint = period === 'today' || period === 'month';
  const revenueError =
    usesRevenueEndpoint && revenue.isError ? formatError(revenue.error) : undefined;
  const authoritativeTotal = usesRevenueEndpoint
    ? (revenue.data?.chiffreAffaires ?? null)
    : current.isSuccess
      ? salesTotal
      : null;
  const purchaseCount = current.isSuccess ? currentPurchases.length : null;
  const articleCount = current.isSuccess ? countItems(currentPurchases) : null;
  const previousTotal = previous.isSuccess ? sumPurchases(previousPurchases) : null;
  const previousCount = previous.isSuccess ? previousPurchases.length : null;
  const previousArticles = previous.isSuccess ? countItems(previousPurchases) : null;
  const average =
    purchaseCount && authoritativeTotal !== null ? authoritativeTotal / purchaseCount : null;
  const previousAverage = previousCount ? previousTotal! / previousCount : null;
  const stockAlerts = (stock.data?.content || [])
    .filter((product) => product.stockActuel <= product.seuilAlerte)
    .map((product) => ({
      ...product,
      alertType: product.stockActuel === 0 ? ('out' as const) : ('low' as const),
    }))
    .sort((left, right) => Number(right.alertType === 'out') - Number(left.alertType === 'out'));
  const activities = useMemo(
    () => toActivity(recentPurchases.data?.content || [], recentDeliveries.data?.content || []),
    [recentPurchases.data, recentDeliveries.data],
  );
  const rankedProducts = useMemo(() => rankProducts(currentPurchases), [currentPurchases]);
  const dayTotals = useMemo(
    () => toDayTotals(currentPurchases, currentDates),
    [currentDates, currentPurchases],
  );
  const latestTimestamp = lastUpdatedLabel([
    current.dataUpdatedAt,
    previous.dataUpdatedAt,
    revenue.dataUpdatedAt,
    stock.dataUpdatedAt,
    recentPurchases.dataUpdatedAt,
    recentDeliveries.dataUpdatedAt,
    inactive.dataUpdatedAt,
  ]);
  const performanceError = current.isError ? formatError(current.error) : undefined;
  const activityError =
    recentPurchases.isError && recentDeliveries.isError
      ? formatError(recentPurchases.error)
      : undefined;
  const activityPartialError = recentPurchases.isError
    ? formatError(recentPurchases.error)
    : recentDeliveries.isError
      ? formatError(recentDeliveries.error)
      : undefined;
  const stockCount = stock.data?.page.totalElements || 0;
  const inactiveCount = isAdmin && inactive.isSuccess ? inactive.data : 0;
  const attentionCount =
    stock.isSuccess && (!isAdmin || inactive.isSuccess)
      ? stockCount + (isAdmin ? inactiveCount : 0)
      : null;
  const attentionClear =
    stock.isSuccess &&
    stockCount === 0 &&
    (!isAdmin || (inactive.isSuccess && inactiveCount === 0));
  const periodLabel = rangeDescription(period);
  const refreshing =
    current.isFetching ||
    previous.isFetching ||
    revenue.isFetching ||
    stock.isFetching ||
    recentPurchases.isFetching ||
    recentDeliveries.isFetching ||
    inactive.isFetching;

  async function refreshDashboard() {
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  return (
    <div className="dashboard-page">
      <EnteteDePage
        dateLabel={longDate(new Date())}
        lastUpdated={latestTimestamp}
        onRefresh={refreshDashboard}
        refreshing={refreshing}
      />

      <section className="dashboard-zone performance-zone" aria-labelledby="performance-title">
        <SectionTitre
          description="Ventes et activité sur la période sélectionnée"
          icon={<SectionIcon type="performance" />}
          id="performance-title"
          title="Performance"
        />

        <SelecteurPeriode onChange={setPeriod} period={period} showDetailedPerformance={isAdmin} />

        <div className="dashboard-indicators" aria-label="Indicateurs de performance">
          <IndicateurCle
            format="money"
            label="Chiffre d’affaires"
            loading={
              current.isLoading || ((period === 'today' || period === 'month') && revenue.isLoading)
            }
            value={revenueError ? null : authoritativeTotal}
            variation={percentageChange(
              current.isSuccess ? salesTotal : null,
              previous.isSuccess ? previousTotal : null,
            )}
          />
          <IndicateurCle
            label="Nombre d’achats"
            loading={current.isLoading}
            value={purchaseCount}
            variation={percentageChange(purchaseCount, previous.isSuccess ? previousCount : null)}
          />
          <IndicateurCle
            format="money"
            label="Panier moyen"
            loading={current.isLoading}
            value={average}
            variation={percentageChange(
              current.isSuccess ? average : null,
              previous.isSuccess ? previousAverage : null,
            )}
          />
          <IndicateurCle
            label="Articles vendus"
            loading={current.isLoading}
            value={articleCount}
            variation={percentageChange(articleCount, previous.isSuccess ? previousArticles : null)}
          />
        </div>
        {previous.isError && (
          <div className="dashboard-comparison-error" role="status">
            <p>Comparaison indisponible : {formatError(previous.error)}</p>
            <button className="button" onClick={() => previous.refetch()} type="button">
              Réessayer
            </button>
          </div>
        )}
        {performanceError && !isAdmin && (
          <div className="dashboard-metric-error" role="alert">
            <p>{performanceError}</p>
            <button className="button" onClick={() => current.refetch()} type="button">
              Réessayer
            </button>
          </div>
        )}
        {revenueError && (
          <div className="dashboard-metric-error" role="alert">
            <p>{revenueError}</p>
            {revenue.isError && usesRevenueEndpoint && (
              <button className="button" onClick={() => revenue.refetch()} type="button">
                Réessayer
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="dashboard-performance-grid">
            <GraphiqueCA
              error={performanceError}
              loading={current.isLoading}
              onRetry={() => current.refetch()}
              periodLabel={periodLabel}
              values={currentPurchases.length > 0 ? dayTotals : []}
            />
            <ClassementProduits
              error={performanceError}
              loading={current.isLoading}
              onRetry={() => current.refetch()}
              products={rankedProducts}
            />
          </div>
        )}
      </section>

      <section
        className={`dashboard-zone attention-zone ${attentionClear ? 'attention-zone-clear' : ''}`}
        aria-labelledby="attention-title"
      >
        <SectionTitre
          count={attentionCount}
          description="Éléments qui demandent une action"
          icon={<SectionIcon type="attention" />}
          id="attention-title"
          title="À surveiller"
        />
        <div className={`dashboard-attention-grid ${isAdmin ? 'dashboard-attention-admin' : ''}`}>
          <ListeAlertesStock
            error={stock.isError ? formatError(stock.error) : undefined}
            loading={stock.isLoading}
            onRetry={() => stock.refetch()}
            products={stockAlerts}
          />
          <ActiviteRecente
            activities={activities}
            audience={isAdmin ? 'team' : 'personal'}
            error={activityError}
            loading={recentPurchases.isLoading && recentDeliveries.isLoading}
            onRetry={() => {
              recentPurchases.refetch();
              recentDeliveries.refetch();
            }}
            partialError={activityError ? undefined : activityPartialError}
          />
        </div>
        {isAdmin && (
          <ComptesInactifs
            count={inactive.data ?? null}
            error={inactive.isError ? formatError(inactive.error) : undefined}
            loading={inactive.isLoading}
            onRetry={() => inactive.refetch()}
          />
        )}
      </section>
    </div>
  );
}
