export type Role = 'ADMIN' | 'VENDEUR';

export interface AuditMetadata {
  creerPar: string;
  modifierPar: string;
  creerDate: string;
  modifierDate: string;
}

export interface User extends AuditMetadata {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  telephone: string | null;
  sexe: 'M' | 'F';
  dateNaissance: string;
  identifiant: string;
  role: Role;
  actif: boolean;
}

export interface Session {
  token: string;
  type: 'Bearer';
  utilisateur: User;
}

export interface Product extends AuditMetadata {
  id: string;
  nom: string;
  description: string | null;
  prixVente: number;
  prixAchatMoyen?: number | null;
  dernierPrixAchat?: number | null;
  stockActuel: number;
  seuilAlerte: number;
}

export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface Client extends AuditMetadata {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  nombreAchats: number;
}

export interface Grossiste extends AuditMetadata {
  id: string;
  nom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface PurchaseLine extends AuditMetadata {
  produitId: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Purchase extends AuditMetadata {
  id: string;
  dateAchat: string;
  total: number;
  clientId: string | null;
  client: string | null;
  lignes: PurchaseLine[];
}

export interface Ticket extends Omit<Purchase, 'id' | 'clientId' | keyof AuditMetadata> {
  achatId: string;
  vendeur: string;
  client: string;
}

export interface DeliveryLine extends AuditMetadata {
  produitId: string;
  produit: string;
  quantite: number;
  prixAchatUnitaire?: number;
  sousTotal?: number;
  nouveauPrixVente?: number | null;
}

export interface Delivery extends AuditMetadata {
  id: string;
  dateLivraison: string;
  total?: number;
  grossisteId: string;
  grossiste: string;
  lignes: DeliveryLine[];
}

export interface Revenue {
  periode: 'jour' | 'mois';
  chiffreAffaires: number;
}

export interface TopProduct {
  produitId: string;
  produit: string;
  quantiteVendue: number;
  chiffreAffaires: number;
}

export interface PurchaseRequest {
  clientId: string | null;
  lignes: { produitId: string; quantite: number }[];
}

export interface DeliveryRequest {
  grossisteId: string;
  lignes: {
    produitId: string;
    quantite: number;
    prixAchatUnitaire: number;
    nouveauPrixVente?: number;
  }[];
}

export interface ProductRequest {
  nom: string;
  description: string;
  prixVente: number;
  prixAchat: number;
  stockActuel: number;
  seuilAlerte: number;
}

export type ProductUpdateRequest = Omit<ProductRequest, 'prixAchat'>;

export interface DeliveryResult extends Delivery {
  avertissements: string[];
}

export interface UserRequest {
  nom: string;
  prenom: string;
  matricule: string;
  telephone: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  identifiant: string;
  motDePasse: string;
  role: Role;
  actif: boolean;
}

export interface ProfileRequest {
  nom: string;
  prenom: string;
  matricule: string;
  telephone: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
}

export interface ClientRequest {
  nom: string;
  prenom: string;
  telephone: string;
}

export interface GrossisteRequest {
  nom: string;
  telephone: string;
  adresse: string;
}

export interface ApiErrorBody {
  message?: string;
  detail?: string;
  errors?: Record<string, string>;
}

export interface AuditJournalEntry {
  id: string;
  acteur: string;
  action: string;
  methode: string;
  ressource: string;
  details: string | null;
  statutHttp: number;
  adresseIp: string | null;
  dateAction: string;
}

export interface AuditPurgeConfiguration {
  actif: boolean;
  conservationJours: number;
}

export interface AuditPurgeResult {
  nombreSupprime: number;
  dateAvant: string;
}
