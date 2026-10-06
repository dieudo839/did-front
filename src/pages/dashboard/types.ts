import type { Delivery, Product, Purchase } from '../../types';

export type DashboardPeriod = 'today' | '7days' | '30days' | 'month';

export interface DateRange {
  start: string;
  end: string;
}

export interface DayTotal {
  date: string;
  total: number;
  count: number;
}

export interface ProductRank {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardActivity {
  id: string;
  type: 'purchase' | 'delivery';
  label: string;
  creerPar: string;
  total: number | null;
  date: string;
}

export interface StockAlert extends Product {
  alertType: 'low' | 'out';
}

export function sumPurchases(purchases: Purchase[]) {
  return purchases.reduce((total, purchase) => total + purchase.total, 0);
}

export function countItems(purchases: Purchase[]) {
  return purchases.reduce(
    (total, purchase) =>
      total + purchase.lignes.reduce((lineTotal, line) => lineTotal + line.quantite, 0),
    0,
  );
}

export function rankProducts(purchases: Purchase[]): ProductRank[] {
  const ranked = new Map<string, ProductRank>();
  purchases.forEach((purchase) => {
    purchase.lignes.forEach((line) => {
      const product = ranked.get(line.produitId) || {
        id: line.produitId,
        name: line.produit,
        quantity: 0,
        revenue: 0,
      };
      product.quantity += line.quantite;
      product.revenue += line.sousTotal;
      ranked.set(line.produitId, product);
    });
  });
  return [...ranked.values()].sort((left, right) => right.quantity - left.quantity).slice(0, 5);
}

export function toActivity(purchases: Purchase[], deliveries: Delivery[]): DashboardActivity[] {
  const purchaseActivity = purchases.map((purchase) => ({
    id: `purchase-${purchase.id}`,
    type: 'purchase' as const,
    label: `Achat · ${purchase.client || 'Client comptoir'}`,
    creerPar: purchase.creerPar,
    total: purchase.total,
    date: purchase.dateAchat,
  }));
  const deliveryActivity = deliveries.map((delivery) => ({
    id: `delivery-${delivery.id}`,
    type: 'delivery' as const,
    label: `Livraison · ${delivery.grossiste}`,
    creerPar: delivery.creerPar,
    total: delivery.total ?? null,
    date: delivery.dateLivraison,
  }));
  return [...purchaseActivity, ...deliveryActivity]
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
    .slice(0, 6);
}

export function toDayTotals(purchases: Purchase[], dates: string[]): DayTotal[] {
  const totals = new Map(dates.map((date) => [date, { date, total: 0, count: 0 }]));
  purchases.forEach((purchase) => {
    const day = purchase.dateAchat.slice(0, 10);
    const entry = totals.get(day);
    if (entry) {
      entry.total += purchase.total;
      entry.count += 1;
    }
  });
  return [...totals.values()];
}
