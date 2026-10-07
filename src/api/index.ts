import { request, requestBlob } from './client';
import type {
  Client,
  ClientRequest,
  AuditJournalEntry,
  AuditPurgeConfiguration,
  AuditPurgeResult,
  Category,
  CategoryRequest,
  Delivery,
  DeliveryRequest,
  DeliveryResult,
  Grossiste,
  GrossisteRequest,
  Page,
  ProfileRequest,
  Product,
  ProductRequest,
  ProductUpdateRequest,
  Purchase,
  PurchaseRequest,
  Revenue,
  Session,
  Ticket,
  TopProduct,
  User,
  UserRequest,
  UserUpdateRequest,
} from '../types';

interface ProductFilters {
  stockMinimum?: string;
  stockMaximum?: string;
  prixMinimum?: string;
  prixMaximum?: string;
  sort?: string;
  categorieId?: string;
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
  auditJournal: (page: number, filters: Record<string, string | undefined>) =>
    request<Page<AuditJournalEntry>>(
      `/api/journaux?${pageParams(page, 20, 'dateAction,desc', filters)}`,
    ),
  auditPurgeConfiguration: () =>
    request<AuditPurgeConfiguration>('/api/journaux/configuration-purge'),
  updateAuditPurgeConfiguration: (configuration: AuditPurgeConfiguration) =>
    request<AuditPurgeConfiguration>('/api/journaux/configuration-purge', {
      method: 'PUT',
      body: JSON.stringify(configuration),
    }),
  purgeAudit: (dateAvant: string) =>
    request<AuditPurgeResult>(`/api/journaux/purge?dateAvant=${dateAvant}`, { method: 'DELETE' }),
  recordTicketPrint: (id: string) =>
    request<void>(`/api/achats/${id}/ticket/impression`, { method: 'POST' }),
  login: (identifiant: string, motDePasse: string) =>
    request<Session>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifiant, motDePasse }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  products: (page = 0, nom = '', size = 20, stockBas = false, filters: ProductFilters = {}) =>
    request<Page<Product>>(
      `/api/produits?${pageParams(page, size, filters.sort || 'creerDate,desc', {
        nom: nom || undefined,
        stockBas: stockBas ? 'true' : undefined,
        stockMinimum: filters.stockMinimum,
        stockMaximum: filters.stockMaximum,
        prixMinimum: filters.prixMinimum,
        prixMaximum: filters.prixMaximum,
        categorieId: filters.categorieId,
      })}`,
    ),
  createProduct: (body: ProductRequest) =>
    request<Product>('/api/produits', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: ProductUpdateRequest) =>
    request<Product>(`/api/produits/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request<void>(`/api/produits/${id}`, { method: 'DELETE' }),
  categories: (page = 0, libelle = '', size = 20) =>
    request<Page<Category>>(
      `/api/categories?${pageParams(page, size, 'libelle,asc', { libelle })}`,
    ),
  allCategories: (libelle = '') => {
    const params = new URLSearchParams({ complet: 'true' });
    if (libelle) params.set('libelle', libelle);
    return request<Category[]>(`/api/categories?${params.toString()}`);
  },
  category: (id: string) => request<Category>(`/api/categories/${id}`),
  createCategory: (body: CategoryRequest) =>
    request<Category>('/api/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: CategoryRequest) =>
    request<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request<void>(`/api/categories/${id}`, { method: 'DELETE' }),
  createPurchase: (body: PurchaseRequest) =>
    request<Purchase>('/api/achats', { method: 'POST', body: JSON.stringify(body) }),
  purchases: (page: number, filters: Record<string, string | undefined>, sort = 'dateAchat,desc') =>
    request<Page<Purchase>>(`/api/achats?${pageParams(page, 10, sort, filters)}`),
  ticket: (id: string) => request<Ticket>(`/api/achats/${id}/ticket`),
  ticketPdf: (id: string) => requestBlob(`/api/achats/${id}/ticket/pdf`),
  createDelivery: (body: DeliveryRequest) =>
    request<DeliveryResult>('/api/livraisons', { method: 'POST', body: JSON.stringify(body) }),
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
  users: (page: number, filters: Record<string, string | undefined> = {}) =>
    request<Page<User>>(`/api/utilisateurs?${pageParams(page, 10, 'nom,asc', filters)}`),
  createUser: (body: UserRequest) =>
    request<User>('/api/utilisateurs', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: UserUpdateRequest) =>
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
