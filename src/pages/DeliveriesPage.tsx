import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Button, ErrorState, Field, LoadingState, Modal } from '../components/ui';
import { Heading } from '../components/layout';
import { applyApiFieldErrors } from '../forms';
import {
  deliverySchema,
  productSchema,
  wholesalerSchema,
  type DeliveryValues,
  type ProductValues,
} from '../schemas/forms';
import type { Grossiste, GrossisteRequest, Page, Product, ProductRequest, Role } from '../types';
import { money } from '../utils';

const emptyProduct: ProductValues = {
  nom: '',
  description: '',
  prixVente: 0,
  stockActuel: 0,
  seuilAlerte: 5,
};

export function DeliveriesPage({ role }: { role: Role }) {
  const admin = role === 'ADMIN';
  const queryClient = useQueryClient();
  const [wholesalerSearch, setWholesalerSearch] = useState('');
  const [wholesalerTerm, setWholesalerTerm] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState<Grossiste | null>(null);
  const [wholesalerModal, setWholesalerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [productLineIndex, setProductLineIndex] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setWholesalerTerm(wholesalerSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [wholesalerSearch]);

  const products = useQuery({
    queryKey: ['products', 'delivery'],
    queryFn: () => api.products(0, '', 100),
  });
  const wholesalers = useQuery({
    queryKey: ['wholesalers', wholesalerTerm],
    queryFn: () => api.wholesalers(wholesalerTerm),
    enabled: Boolean(wholesalerTerm) && !selectedWholesaler,
  });
  const form = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      grossisteId: '',
      lignes: [{ produitId: '', quantite: 1, prixAchatUnitaire: 0 }],
    },
  });
  const productForm = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  });
  const rowList = useFieldArray({ control: form.control, name: 'lignes' });
  const watched = useWatch({ control: form.control, name: 'lignes' }) || [];
  const estimate = useMemo(
    () => watched.reduce((total, line) => total + line.quantite * line.prixAchatUnitaire, 0),
    [watched],
  );
  const wholesalerForm = useForm<GrossisteRequest>({
    resolver: zodResolver(wholesalerSchema),
    defaultValues: { nom: '', telephone: '', adresse: '' },
  });
  const saveWholesaler = useMutation({
    mutationFn: (body: GrossisteRequest) => api.createWholesaler(body),
    onSuccess: (wholesaler) => {
      setSelectedWholesaler(wholesaler);
      setWholesalerSearch(wholesaler.nom);
      form.setValue('grossisteId', wholesaler.id, { shouldValidate: true });
      setWholesalerModal(false);
      queryClient.invalidateQueries({ queryKey: ['wholesalers'] });
      wholesalerForm.reset();
    },
    onError: (error) => applyApiFieldErrors(error, wholesalerForm.setError),
  });
  const save = useMutation({
    mutationFn: (values: DeliveryValues) => api.createDelivery(values),
    onSuccess: (delivery) => {
      setSuccess(`Arrivage de ${delivery.grossiste} enregistré. Le stock a été mis à jour.`);
      form.reset({
        grossisteId: '',
        lignes: [{ produitId: '', quantite: 1, prixAchatUnitaire: 0 }],
      });
      setSelectedWholesaler(null);
      setWholesalerSearch('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (error) => applyApiFieldErrors(error, form.setError),
  });
  const createProduct = useMutation({
    mutationFn: (values: ProductRequest) => api.createProduct(values),
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await products.refetch();
      queryClient.setQueryData<Page<Product>>(['products', 'delivery'], (page) => {
        if (!page || page.content.some((item) => item.id === product.id)) {
          return page;
        }

        return {
          ...page,
          content: [product, ...page.content].slice(0, page.size),
        };
      });
      if (productLineIndex !== null) {
        form.setValue(`lignes.${productLineIndex}.produitId`, product.id, {
          shouldValidate: true,
        });
      }
      setProductModal(false);
      setProductLineIndex(null);
      productForm.reset(emptyProduct);
      setSuccess(`${product.nom} a été ajouté au catalogue et à cette ligne d’arrivage.`);
    },
    onError: (error) => applyApiFieldErrors(error, productForm.setError),
  });
  const submit = form.handleSubmit((values) => {
    setSuccess('');
    save.mutate(values);
  });

  function selectWholesaler(wholesaler: Grossiste) {
    setSelectedWholesaler(wholesaler);
    setWholesalerSearch(wholesaler.nom);
    form.setValue('grossisteId', wholesaler.id, { shouldValidate: true });
  }

  function handleWholesalerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const options = document.querySelectorAll<HTMLButtonElement>('#grossiste-options button');
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      options.item(0)?.focus();
    }
    if (event.key === 'Enter' && !selectedWholesaler) {
      event.preventDefault();
      if (!wholesalers.isSuccess) {
        return;
      }
      const first = wholesalers.data.content[0];
      if (first) {
        selectWholesaler(first);
      } else if (wholesalers.data.content.length === 0 && wholesalerTerm) {
        setWholesalerModal(true);
      }
    }
    if (event.key === 'Escape' && !selectedWholesaler) {
      setWholesalerSearch('');
      form.setValue('grossisteId', '');
    }
  }

  function openProductModal(index: number) {
    productForm.reset(emptyProduct);
    setProductLineIndex(index);
    setProductModal(true);
  }

  return (
    <>
      <Heading kicker="RÉAPPROVISIONNEMENT · ENTRÉE DE STOCK" title="Les arrivages" />
      <form className="delivery-form" onSubmit={submit} noValidate>
        <div className="supplier-picker">
          <Field
            aria-autocomplete="list"
            aria-controls={
              wholesalerTerm === wholesalerSearch.trim() && wholesalers.data?.content.length
                ? 'grossiste-options'
                : undefined
            }
            aria-expanded={Boolean(wholesalerSearch.trim()) && !selectedWholesaler}
            aria-haspopup="listbox"
            label="Grossiste"
            name="grossiste-search"
            value={wholesalerSearch}
            onChange={(event) => {
              setWholesalerSearch(event.target.value);
              setSelectedWholesaler(null);
              form.setValue('grossisteId', '');
            }}
            onKeyDown={handleWholesalerKeyDown}
            placeholder="Chercher par nom…"
            autoComplete="off"
            error={form.formState.errors.grossisteId?.message}
          />
          {wholesalerSearch.trim() && !selectedWholesaler && (
            <>
              {wholesalerTerm !== wholesalerSearch.trim() || wholesalers.isLoading ? (
                <p className="supplier-search-status" role="status">
                  Recherche des grossistes…
                </p>
              ) : wholesalers.isError ? (
                <div className="supplier-search-error">
                  <ErrorState error={wholesalers.error} />
                  <Button onClick={() => wholesalers.refetch()} type="button">
                    Réessayer
                  </Button>
                </div>
              ) : wholesalers.data?.content.length ? (
                <div
                  className="supplier-options"
                  id="grossiste-options"
                  role="listbox"
                  aria-label="Grossistes correspondants"
                >
                  {wholesalers.data.content.map((wholesaler) => (
                    <button
                      aria-selected="false"
                      className="suggestion"
                      key={wholesaler.id}
                      onClick={() => selectWholesaler(wholesaler)}
                      role="option"
                      type="button"
                    >
                      <span>{wholesaler.nom}</span>
                      <small>{wholesaler.telephone || 'Téléphone non renseigné'}</small>
                    </button>
                  ))}
                </div>
              ) : wholesalers.isSuccess ? (
                <div className="supplier-no-results" role="status">
                  <span>Aucun grossiste ne correspond à cette recherche.</span>
                  <button
                    className="text-button"
                    onClick={() => setWholesalerModal(true)}
                    type="button"
                  >
                    Ajouter ce grossiste
                  </button>
                </div>
              ) : null}
            </>
          )}
          {selectedWholesaler && (
            <p className="supplier-selected" role="status">
              Grossiste sélectionné : {selectedWholesaler.nom}
            </p>
          )}
        </div>
        <h2>Marchandises reçues</h2>
        {products.isLoading ? (
          <LoadingState label="Lecture du catalogue…" />
        ) : products.error ? (
          <ErrorState error={products.error} />
        ) : (
          rowList.fields.map((row, index) => (
            <div className="delivery-item" key={row.id}>
              <div className="delivery-line">
                <div className="field-wrap">
                  <label className="field-label" htmlFor={`delivery-product-${index}`}>
                    Produit
                  </label>
                  <select
                    className="field-select"
                    id={`delivery-product-${index}`}
                    aria-label={`Produit pour ligne ${index + 1}`}
                    aria-invalid={Boolean(form.formState.errors.lignes?.[index]?.produitId)}
                    aria-describedby={
                      form.formState.errors.lignes?.[index]?.produitId
                        ? `line-product-${index}-error`
                        : undefined
                    }
                    {...form.register(`lignes.${index}.produitId`)}
                  >
                    <option value="">Choisir un produit</option>
                    {products.data?.content.map((product: Product) => (
                      <option key={product.id} value={product.id}>
                        {product.nom}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.lignes?.[index]?.produitId?.message && (
                    <span className="field-error" id={`line-product-${index}-error`} role="alert">
                      {form.formState.errors.lignes[index]?.produitId?.message}
                    </span>
                  )}
                </div>
                <Field
                  label="Quantité"
                  type="number"
                  min="1"
                  step="1"
                  {...form.register(`lignes.${index}.quantite`, { valueAsNumber: true })}
                  error={form.formState.errors.lignes?.[index]?.quantite?.message}
                />
                <Field
                  label="Prix d’achat unitaire"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...form.register(`lignes.${index}.prixAchatUnitaire`, { valueAsNumber: true })}
                  error={form.formState.errors.lignes?.[index]?.prixAchatUnitaire?.message}
                />
                <button type="button" className="remove" onClick={() => rowList.remove(index)}>
                  Retirer
                </button>
              </div>
              {admin && (
                <button
                  className="text-button add-delivery-product"
                  onClick={() => openProductModal(index)}
                  type="button"
                >
                  Produit absent ? Ajouter au catalogue
                </button>
              )}
            </div>
          ))
        )}
        {form.formState.errors.lignes?.root?.message && (
          <p className="field-error" role="alert">
            {form.formState.errors.lignes.root.message}
          </p>
        )}
        <button
          type="button"
          className="text-button"
          onClick={() => rowList.append({ produitId: '', quantite: 1, prixAchatUnitaire: 0 })}
        >
          + Ajouter une ligne
        </button>
        <div className="basket-total">
          <span>TOTAL INDICATIF</span>
          <strong>{money(estimate)}</strong>
        </div>
        {success && (
          <p className="success" role="status">
            {success}
          </p>
        )}
        {save.isError && <ErrorState error={save.error} />}
        <Button className="primary" type="submit" disabled={save.isPending || products.isLoading}>
          {save.isPending ? 'Enregistrement…' : 'Valider l’arrivage'}
        </Button>
      </form>

      {wholesalerModal && (
        <Modal title="Nouveau grossiste" onClose={() => setWholesalerModal(false)}>
          <form
            className="editor-form"
            onSubmit={wholesalerForm.handleSubmit((values) => saveWholesaler.mutate(values))}
            noValidate
          >
            <Field
              label="Nom"
              {...wholesalerForm.register('nom')}
              error={wholesalerForm.formState.errors.nom?.message}
            />
            <Field
              label="Téléphone"
              {...wholesalerForm.register('telephone')}
              error={wholesalerForm.formState.errors.telephone?.message}
            />
            <Field
              label="Adresse"
              {...wholesalerForm.register('adresse')}
              error={wholesalerForm.formState.errors.adresse?.message}
            />
            {saveWholesaler.isError && <ErrorState error={saveWholesaler.error} />}
            <Button className="primary" type="submit" disabled={saveWholesaler.isPending}>
              Créer le grossiste
            </Button>
          </form>
        </Modal>
      )}
      {productModal && (
        <Modal title="Ajouter un produit au catalogue" onClose={() => setProductModal(false)}>
          <p className="muted">
            Le stock démarre à zéro. La quantité saisie dans l’arrivage sera ajoutée à ce stock.
          </p>
          <form
            className="editor-form"
            onSubmit={productForm.handleSubmit((values) => createProduct.mutate(values))}
            noValidate
          >
            <Field
              label="Nom"
              {...productForm.register('nom')}
              error={productForm.formState.errors.nom?.message}
            />
            <Field
              label="Description"
              {...productForm.register('description')}
              error={productForm.formState.errors.description?.message}
            />
            <Field
              label="Prix de vente"
              min="0.01"
              step="0.01"
              type="number"
              {...productForm.register('prixVente', { valueAsNumber: true })}
              error={productForm.formState.errors.prixVente?.message}
            />
            <Field
              label="Seuil d’alerte"
              min="0"
              step="1"
              type="number"
              {...productForm.register('seuilAlerte', { valueAsNumber: true })}
              error={productForm.formState.errors.seuilAlerte?.message}
            />
            {createProduct.isError && <ErrorState error={createProduct.error} />}
            <Button className="primary" type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Création…' : 'Créer et ajouter à l’arrivage'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
