import { z } from 'zod';

const uuid = z.string().uuid('Identifiant invalide.');

const positiveAmount = z.number().finite().positive('Le montant doit être supérieur à zéro.');
const requiredPurchasePrice = z
  .number({ error: "Le prix d'achat est obligatoire et doit être supérieur à 0." })
  .finite()
  .positive("Le prix d'achat est obligatoire et doit être supérieur à 0.");
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
  prixAchat: requiredPurchasePrice,
  stockActuel: z.number().int().min(0, 'Le stock ne peut pas être négatif.'),
  seuilAlerte: z.number().int().min(0, 'Le seuil ne peut pas être négatif.'),
  categorieId: uuid,
});

export const productUpdateSchema = productSchema.omit({ prixAchat: true });

export const userSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom.').max(100),
  prenom: z.string().trim().min(1, 'Saisissez le prénom.').max(100),
  matricule: z.string().trim().min(1, 'Saisissez le matricule.').max(50),
  telephone: z.string().max(30),
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

export const userUpdateSchema = userSchema.extend({
  motDePasse: z
    .string()
    .optional()
    .refine(
      (value) => value === undefined || value.trim().length === 0 || value.length >= 8,
      '8 caractères minimum.',
    ),
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
      z
        .object({
          produitId: uuid,
          quantite: positiveQuantity,
          prixAchatUnitaire: requiredPurchasePrice,
          mettreAJourPrixVente: z.boolean().optional(),
          nouveauPrixVente: positiveAmount.optional(),
        })
        .refine((line) => !line.mettreAJourPrixVente || line.nouveauPrixVente !== undefined, {
          path: ['nouveauPrixVente'],
          message: 'Saisissez le nouveau prix de vente.',
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

export const profileSchema = z.object({
  nom: z.string().trim().min(1, 'Saisissez le nom.').max(100),
  prenom: z.string().trim().min(1, 'Saisissez le prénom.').max(100),
  matricule: z.string().trim().min(1, 'Saisissez le matricule.').max(50),
  telephone: z.string().max(30),
  sexe: z.enum(['M', 'F'], { error: 'Choisissez le sexe.' }),
  dateNaissance: z
    .string()
    .min(1, 'Saisissez la date de naissance.')
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Date invalide.')
    .refine((value) => new Date(value) < new Date(), 'La date doit être passée.'),
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

export const categorySchema = z.object({
  libelle: z
    .string()
    .trim()
    .min(2, 'Le libellé doit contenir au moins 2 caractères.')
    .max(100, '100 caractères maximum.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type ProductValues = z.infer<typeof productSchema>;
export type UserValues = z.infer<typeof userSchema>;
export type UserUpdateValues = z.infer<typeof userUpdateSchema>;
export type PurchaseValues = z.infer<typeof purchaseSchema>;
export type DeliveryValues = z.infer<typeof deliverySchema>;
export type PasswordValues = z.infer<typeof passwordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type CategoryValues = z.infer<typeof categorySchema>;
