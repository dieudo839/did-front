import { request, requestBlob } from './client';
import type {
  Client,
  ClientRequest,
  Delivery,
  DeliveryRequest,
  Grossiste,
  GrossisteRequest,
  Page,
  ProfileRequest,
  Product,
  ProductRequest,
  Purchase,
  PurchaseRequest,
  Revenue,
  Session,
  Ticket,
  TopProduct,
  User,
  UserRequest,
} from '../types';

interface ProductFilters {
  stockMinimum?: string;
  stockMaximum?: string;
  prixMinimum?: string;
  prixMaximum?: string;
  sort?: string;
}

interface ClientFilters {
  telephone?: string;
  frequents?: boolean;
  achatsMinimum?: string;
}

function pageParams(
  page: number,
  size: number,
  sort: string,
  values: Record<string, string | number | undefined> = {},
) {
  const params = new URLSearchParams({ page: String(page), size: String(size), sort });
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

export const api = {
  login: (identifiant: string, motDePasse: string) =>
    request<Session>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifiant, motDePasse }),
    }),
  products: (page = 0, nom = '', size = 20, stockBas = false, filters: ProductFilters = {}) =>
    request<Page<Product>>(
      `/api/produits?${pageParams(page, size, filters.sort || 'nom,asc', {
        nom: nom || undefined,
        stockBas: stockBas ? 'true' : undefined,
        stockMinimum: filters.stockMinimum,
        stockMaximum: filters.stockMaximum,
        prixMinimum: filters.prixMinimum,
        prixMaximum: filters.prixMaximum,
      })}`,
    ),
  createProduct: (body: ProductRequest) =>
    request<Product>('/api/produits', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: ProductRequest) =>
    request<Product>(`/api/produits/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<void>(`/api/produits/${id}`, { method: 'DELETE' }),
  createPurchase: (body: PurchaseRequest) =>
    request<Purchase>('/api/achats', { method: 'POST', body: JSON.stringify(body) }),
  purchases: (page: number, filters: Record<string, string | undefined>, sort = 'dateAchat,desc') =>
    request<Page<Purchase>>(`/api/achats?${pageParams(page, 10, sort, filters)}`),
  ticket: (id: string) => request<Ticket>(`/api/achats/${id}/ticket`),
  ticketPdf: (id: string) => requestBlob(`/api/achats/${id}/ticket/pdf`),
  createDelivery: (body: DeliveryRequest) =>
    request<Delivery>('/api/livraisons', { method: 'POST', body: JSON.stringify(body) }),
  deliveries: (
    page: number,
    filters: Record<string, string | undefined>,
    sort = 'dateLivraison,desc',
  ) => request<Page<Delivery>>(`/api/livraisons?${pageParams(page, 10, sort, filters)}`),
  clients: (nom = '', page = 0, size = nom ? 10 : 100, filters: ClientFilters = {}) =>
    request<Page<Client>>(
      `/api/clients?${pageParams(page, size, 'nom,asc', {
        nom,
        telephone: filters.telephone,
        frequents: filters.frequents ? 'true' : undefined,
        achatsMinimum: filters.achatsMinimum,
      })}`,
    ),
  createClient: (body: ClientRequest) =>
    request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(body) }),
  wholesalers: (nom = '', page = 0, size = nom ? 10 : 100) =>
    request<Page<Grossiste>>(`/api/grossistes?${pageParams(page, size, 'nom,asc', { nom })}`),
  createWholesaler: (body: GrossisteRequest) =>
    request<Grossiste>('/api/grossistes', { method: 'POST', body: JSON.stringify(body) }),
  users: (page: number) =>
    request<Page<User>>(`/api/utilisateurs?${pageParams(page, 10, 'nom,asc')}`),
  createUser: (body: UserRequest) =>
    request<User>('/api/utilisateurs', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: UserRequest) =>
    request<User>(`/api/utilisateurs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setUserStatus: (id: string, actif: boolean) =>
    request<User>(`/api/utilisateurs/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ actif }),
    }),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    request<void>('/api/auth/mot-de-passe', {
      method: 'PUT',
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }),
    }),
  updateProfile: (body: ProfileRequest) =>
    request<User>('/api/auth/profil', { method: 'PUT', body: JSON.stringify(body) }),
  revenue: (periode: 'jour' | 'mois') =>
    request<Revenue>(`/api/statistiques/chiffre-affaires?periode=${periode}`),
  topProducts: (limit = 5) =>
    request<TopProduct[]>(`/api/statistiques/top-produits?limit=${limit}`),
};
