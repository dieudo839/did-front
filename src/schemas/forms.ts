import { z } from 'zod';

const uuid = z.string().uuid('Identifiant invalide.');

const positiveAmount = z.number().finite().positive('Le montant doit être supérieur à zéro.');
const positiveQuantity = z
  .number()
  .int('Saisissez un nombre entier.')
  .positive('La quantité doit être supérieure à zéro.');

export const loginSchema = z.object({
  identifiant: z.string().trim().min(1, 'Saisissez votre nom d’utilisateur.'),
  motDePasse: z.string().min(1, 'Saisissez votre mot de passe.'),
});

export const productSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom du produit.').max(150),
  description: z.string().max(500, '500 caractères maximum.'),
  prixVente: positiveAmount,
  stockActuel: z.number().int().min(0, 'Le stock ne peut pas être négatif.'),
  seuilAlerte: z.number().int().min(0, 'Le seuil ne peut pas être négatif.'),
});

export const userSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom.').max(100),
  prenom: z.string().trim().min(1, 'Saisissez le prénom.').max(100),
  matricule: z.string().trim().min(1, 'Saisissez le matricule.').max(50),
  sexe: z.enum(['M', 'F'], { error: 'Choisissez le sexe.' }),
  dateNaissance: z
    .string()
    .min(1, 'Saisissez la date de naissance.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Date invalide.')
    .refine((value) => new Date(value) < new Date(), 'La date doit être passée.'),
  identifiant: z.string().trim().min(1, 'Saisissez un nom d’utilisateur.').max(50),
  motDePasse: z.string().min(8, '8 caractères minimum.'),
  role: z.enum(['ADMIN', 'VENDEUR']),
  actif: z.boolean(),
});

export const purchaseSchema = z.object({
  clientId: uuid.nullable(),
  lignes: z
    .array(
      z.object({
        produitId: uuid,
        quantite: positiveQuantity,
      }),
    )
    .min(1, 'Ajoutez au moins un article.'),
});

export const deliverySchema = z.object({
  grossisteId: uuid,
  lignes: z
    .array(
      z.object({
        produitId: uuid,
        quantite: positiveQuantity,
        prixAchatUnitaire: positiveAmount,
      }),
    )
    .min(1, 'Ajoutez au moins une ligne.'),
});

export const passwordSchema = z
  .object({
    ancienMotDePasse: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
    nouveauMotDePasse: z.string().min(8, '8 caractères minimum.'),
    confirmation: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
  })
  .refine((values) => values.nouveauMotDePasse === values.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne correspondent pas.',
  });

export const clientSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom.').max(100),
  prenom: z.string().max(100),
  telephone: z.string().max(30),
});

export const wholesalerSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom.').max(150),
  telephone: z.string().max(30),
  adresse: z.string().max(255),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ProductValues = z.infer<typeof productSchema>;
export type UserValues = z.infer<typeof userSchema>;
export type PurchaseValues = z.infer<typeof purchaseSchema>;
export type DeliveryValues = z.infer<typeof deliverySchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;
