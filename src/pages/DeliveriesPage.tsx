import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import {
  ActionFeedback,
  Button,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  NumberField,
} from '../components/ui';
import { Heading } from '../components/layout';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
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
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
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
    () =>
      watched.reduce((total, line) => {
        const quantity = Number.isFinite(line.quantite) ? line.quantite : 0;
        const unitPrice = Number.isFinite(line.prixAchatUnitaire) ? line.prixAchatUnitaire : 0;
        return total + quantity * unitPrice;
      }, 0),
    [watched],
  );
  const totalQuantity = watched.reduce(
    (total, line) => total + (Number.isFinite(line.quantite) ? line.quantite : 0),
    0,
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
      setFeedback({ tone: 'success', message: `${wholesaler.nom} a été ajouté au carnet.` });
      queryClient.invalidateQueries({ queryKey: ['wholesalers'] });
      wholesalerForm.reset();
    },
    onError: (error) => {
      applyApiFieldErrors(error, wholesalerForm.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const save = useMutation({
    mutationFn: (values: DeliveryValues) => api.createDelivery(values),
    onSuccess: (delivery) => {
      setFeedback({
        tone: 'success',
        message: `Arrivage de ${delivery.grossiste} enregistré. Le stock a été mis à jour.`,
      });
      form.reset({
        grossisteId: '',
        lignes: [{ produitId: '', quantite: 1, prixAchatUnitaire: 0 }],
      });
      setSelectedWholesaler(null);
      setWholesalerSearch('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
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
      setFeedback({
        tone: 'success',
        message: `${product.nom} a été ajouté au catalogue et à cette ligne d’arrivage.`,
      });
    },
    onError: (error) => {
      applyApiFieldErrors(error, productForm.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const submit = form.handleSubmit((values) => {
    setFeedback(null);
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
      <Heading kicker="RÉAPPROVISIONNEMENT · ENTRÉE DE STOCK" title="Nouvel arrivage" />
      <p className="delivery-introduction">
        Enregistrez les marchandises reçues. Le stock sera mis à jour après validation.
      </p>
      <form className="delivery-form" onSubmit={submit} noValidate>
        <div className="delivery-main">
          <section className="delivery-section" aria-labelledby="delivery-supplier-title">
            <div className="delivery-section-heading">
              <span className="delivery-step" aria-hidden="true">
                01
              </span>
              <div>
                <h2 id="delivery-supplier-title">Grossiste</h2>
                <p>Choisissez le fournisseur de cet arrivage.</p>
              </div>
            </div>
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
          </section>
          <section className="delivery-section" aria-labelledby="delivery-products-title">
            <div className="delivery-section-heading delivery-products-heading">
              <span className="delivery-step" aria-hidden="true">
                02
              </span>
              <div>
                <h2 id="delivery-products-title">Produits reçus</h2>
                <p>Ajoutez une ligne pour chaque produit de la livraison.</p>
              </div>
              <Button
                className="delivery-add-line"
                onClick={() =>
                  rowList.prepend(
                    { produitId: '', quantite: 1, prixAchatUnitaire: 0 },
                    { shouldFocus: true },
                  )
                }
                type="button"
              >
                + Ajouter une ligne
              </Button>
            </div>
            {products.isLoading ? (
              <LoadingState label="Lecture du catalogue…" />
            ) : products.error ? (
              <ErrorState error={products.error} />
            ) : (
              rowList.fields.map((row, index) => (
                <div className="delivery-item" key={row.id}>
                  <div className="delivery-item-heading">
                    <strong>Ligne {String(index + 1).padStart(2, '0')}</strong>
                    {rowList.fields.length > 1 && (
                      <IconButton
                        className="danger-icon"
                        icon="remove"
                        label={`Retirer la ligne ${index + 1}`}
                        onClick={() => rowList.remove(index)}
                      />
                    )}
                  </div>
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
                        <span
                          className="field-error"
                          id={`line-product-${index}-error`}
                          role="alert"
                        >
                          {form.formState.errors.lignes[index]?.produitId?.message}
                        </span>
                      )}
                    </div>
                    <NumberField
                      control={form.control}
                      label="Quantité reçue"
                      name={`lignes.${index}.quantite`}
                      min={1}
                      step={1}
                      error={form.formState.errors.lignes?.[index]?.quantite?.message}
                    />
                    <NumberField
                      control={form.control}
                      label="Prix d’achat unitaire"
                      name={`lignes.${index}.prixAchatUnitaire`}
                      min={0.01}
                      step={0.01}
                      decimal
                      error={form.formState.errors.lignes?.[index]?.prixAchatUnitaire?.message}
                    />
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
          </section>
        </div>
        <aside className="delivery-summary" aria-labelledby="delivery-summary-title">
          <p className="eyebrow">RÉCAPITULATIF</p>
          <h2 id="delivery-summary-title">Cet arrivage</h2>
          <dl className="delivery-summary-details">
            <div>
              <dt>Grossiste</dt>
              <dd>{selectedWholesaler?.nom || 'À sélectionner'}</dd>
            </div>
            <div>
              <dt>Lignes de produits</dt>
              <dd>{rowList.fields.length}</dd>
            </div>
            <div>
              <dt>Unités reçues</dt>
              <dd>{totalQuantity}</dd>
            </div>
          </dl>
          <div className="delivery-summary-total">
            <span>Total indicatif</span>
            <strong>{money(estimate)}</strong>
          </div>
          <Button
            className="primary full"
            type="submit"
            disabled={save.isPending || products.isLoading}
          >
            {save.isPending ? 'Enregistrement…' : 'Valider l’arrivage'}
          </Button>
          <p className="delivery-summary-note">Le total définitif est calculé par le serveur.</p>
        </aside>
      </form>

      {wholesalerModal && (
        <Modal
          title="Nouveau grossiste"
          description="Ajoutez ce fournisseur au carnet pour le sélectionner dans cet arrivage."
          onClose={() => setWholesalerModal(false)}
        >
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
            <Button className="primary" type="submit" disabled={saveWholesaler.isPending}>
              Créer le grossiste
            </Button>
          </form>
        </Modal>
      )}
      {productModal && (
        <Modal
          title="Ajouter un produit au catalogue"
          description="Le produit sera créé puis associé à la ligne d’arrivage sélectionnée."
          onClose={() => setProductModal(false)}
        >
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
            <NumberField
              control={productForm.control}
              label="Prix de vente"
              name="prixVente"
              min={0.01}
              step={0.01}
              decimal
              error={productForm.formState.errors.prixVente?.message}
            />
            <NumberField
              control={productForm.control}
              label="Seuil d’alerte"
              name="seuilAlerte"
              min={0}
              step={1}
              error={productForm.formState.errors.seuilAlerte?.message}
            />
            <Button className="primary" type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Création…' : 'Créer et ajouter à l’arrivage'}
            </Button>
          </form>
        </Modal>
      )}
      {feedback && (
        <ActionFeedback
          tone={feedback.tone}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  );
}
