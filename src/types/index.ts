export type Role = 'ADMIN' | 'VENDEUR';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
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

export interface Product {
  id: string;
  nom: string;
  description: string | null;
  prixVente: number;
  stockActuel: number;
  seuilAlerte: number;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  number: number;
  totalElements: number;
  size: number;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  nombreAchats: number;
}

export interface Grossiste {
  id: string;
  nom: string;
  telephone: string | null;
  adresse: string | null;
}

export interface PurchaseLine {
  produitId: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface Purchase {
  id: string;
  dateAchat: string;
  total: number;
  clientId: string | null;
  client: string | null;
  lignes: PurchaseLine[];
}

export interface Ticket extends Omit<Purchase, 'id' | 'clientId'> {
  achatId: string;
  vendeur: string;
  client: string;
}

export interface DeliveryLine {
  produitId: string;
  produit: string;
  quantite: number;
  prixAchatUnitaire: number;
  sousTotal: number;
}

export interface Delivery {
  id: string;
  dateLivraison: string;
  total: number;
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
  lignes: { produitId: string; quantite: number; prixAchatUnitaire: number }[];
}

export interface ProductRequest {
  nom: string;
  description: string;
  prixVente: number;
  stockActuel: number;
  seuilAlerte: number;
}

export interface UserRequest {
  nom: string;
  prenom: string;
  matricule: string;
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
