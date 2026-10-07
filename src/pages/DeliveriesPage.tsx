import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { CategoryField } from '../components/CategoryField';
import {
  ActionFeedback,
  Button,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  NumberField,
  RequiredMark,
} from '../components/ui';
import { Heading } from '../components/layout';
import { PhoneField } from '../components/PhoneField';
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

function DeliveryProductPicker({
  id,
  lineNumber,
  value,
  error,
  onChange,
  onProductSelect,
}: {
  id: string;
  lineNumber: number;
  value: string;
  error?: string;
  onChange: (productId: string) => void;
  onProductSelect: (product: Product) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const products = useQuery({
    queryKey: ['products', 'delivery-search', term],
    queryFn: () => api.products(0, term, 20),
    enabled: focused,
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => setTerm(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!value) {
      setSelectedProduct(null);
    }
  }, [value]);

  const options = products.data?.content || [];
  const displayValue = focused ? search : selectedProduct?.nom || '';
  const optionsId = `${id}-options`;
  const errorId = `${id}-error`;

  function selectProduct(product: Product) {
    setSelectedProduct(product);
    setSearch(product.nom);
    onChange(product.id);
    onProductSelect(product);
    setFocused(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      document.getElementById(`${optionsId}-0`)?.focus();
    }

    if (event.key === 'Enter' && options[0]) {
      event.preventDefault();
      selectProduct(options[0]);
    }

    if (event.key === 'Escape') {
      setFocused(false);
      setSearch(selectedProduct?.nom || '');
    }
  }

  return (
    <div
      className="field-wrap delivery-product-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
    >
      <label className="field" htmlFor={id}>
        <span className="field-label-row">
          <span>Produit</span>
          <RequiredMark />
        </span>
        <input
          id={id}
          type="search"
          required
          aria-required="true"
          role="combobox"
          aria-label={`Rechercher un produit pour la ligne ${lineNumber}`}
          aria-autocomplete="list"
          aria-controls={optionsId}
          aria-expanded={focused}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          placeholder="Rechercher un produit…"
          value={displayValue}
          onFocus={() => {
            setSearch(selectedProduct?.nom || '');
            setFocused(true);
          }}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedProduct(null);
            onChange('');
          }}
          onKeyDown={handleKeyDown}
        />
      </label>
      {focused && (
        <div className="delivery-product-options" id={optionsId} role="listbox">
          {term !== search.trim() || products.isLoading ? (
            <p className="delivery-product-status" role="status">
              Recherche des produits…
            </p>
          ) : products.isError ? (
            <p className="delivery-product-status field-error" role="alert">
              Impossible de charger les produits.
            </p>
          ) : options.length ? (
            options.map((product, index) => (
              <button
                id={`${optionsId}-${index}`}
                aria-selected={product.id === value}
                className="suggestion"
                key={product.id}
                onClick={() => selectProduct(product)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    document.getElementById(`${optionsId}-${index + 1}`)?.focus();
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    if (index === 0) {
                      document.getElementById(id)?.focus();
                    } else {
                      document.getElementById(`${optionsId}-${index - 1}`)?.focus();
                    }
                  }
                  if (event.key === 'Escape') {
                    setFocused(false);
                    document.getElementById(id)?.focus();
                  }
                }}
                role="option"
                type="button"
              >
                <span>
                  {product.nom}
                  <small>{product.categorieLibelle}</small>
                </span>
                <small>{product.stockActuel} en stock</small>
              </button>
            ))
          ) : (
            <p className="delivery-product-status" role="status">
              Aucun produit ne correspond à cette recherche.
            </p>
          )}
        </div>
      )}
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

const emptyProduct: ProductValues = {
  nom: '',
  description: '',
  prixVente: 0,
  prixAchat: 0,
  stockActuel: 0,
  seuilAlerte: 5,
  categorieId: '',
};

export function DeliveriesPage({ role }: { role: Role }) {
  const admin = role === 'ADMIN';
  const queryClient = useQueryClient();
  const [wholesalerSearch, setWholesalerSearch] = useState('');
  const [wholesalerTerm, setWholesalerTerm] = useState('');
  const [wholesalerListOpen, setWholesalerListOpen] = useState(false);
  const [selectedWholesaler, setSelectedWholesaler] = useState<Grossiste | null>(null);
  const [wholesalerModal, setWholesalerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [productLineIndex, setProductLineIndex] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Product>>({});
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
    enabled: wholesalerListOpen && !selectedWholesaler,
  });
  const form = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    mode: 'onChange',
    defaultValues: {
      grossisteId: '',
      lignes: [
        {
          produitId: '',
          quantite: 1,
          prixAchatUnitaire: 0,
          mettreAJourPrixVente: false,
        },
      ],
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
  const incompleteLineIndex = watched.findIndex(
    (line) =>
      !line.produitId ||
      !Number.isFinite(line.quantite) ||
      line.quantite <= 0 ||
      !Number.isFinite(line.prixAchatUnitaire) ||
      line.prixAchatUnitaire <= 0,
  );
  const incompleteMessage = !selectedWholesaler
    ? 'Sélectionnez un grossiste pour continuer.'
    : incompleteLineIndex >= 0
      ? `Complétez la ligne ${incompleteLineIndex + 1} : produit, quantité et prix d'achat.`
      : null;
  const percentageFormatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const wholesalerForm = useForm<GrossisteRequest>({
    resolver: zodResolver(wholesalerSchema),
    defaultValues: { nom: '', telephone: '', adresse: '' },
  });
  const saveWholesaler = useMutation({
    mutationFn: (body: GrossisteRequest) => api.createWholesaler(body),
    onSuccess: (wholesaler) => {
      setSelectedWholesaler(wholesaler);
      setWholesalerSearch(wholesaler.nom);
      setWholesalerListOpen(false);
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
        message: [
          `Arrivage de ${delivery.grossiste} enregistré. Le stock a été mis à jour.`,
          ...(delivery.avertissements || []),
        ].join(' '),
      });
      form.reset({
        grossisteId: '',
        lignes: [
          {
            produitId: '',
            quantite: 1,
            prixAchatUnitaire: 0,
            mettreAJourPrixVente: false,
          },
        ],
      });
      setSelectedProducts({});
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
      setSelectedProducts((current) => ({ ...current, [product.id]: product }));
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await products.refetch();
      queryClient.setQueryData<Page<Product>>(['products', 'delivery'], (page) => {
        if (!page || page.content.some((item) => item.id === product.id)) {
          return page;
        }

        return {
          ...page,
          content: [product, ...page.content].slice(0, page.page.size),
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
    save.mutate({
      grossisteId: values.grossisteId,
      lignes: values.lignes.map((line) => ({
        produitId: line.produitId,
        quantite: line.quantite,
        prixAchatUnitaire: line.prixAchatUnitaire,
        ...(admin && line.mettreAJourPrixVente && line.nouveauPrixVente !== undefined
          ? { nouveauPrixVente: line.nouveauPrixVente }
          : {}),
      })),
    });
  });

  function projectedCost(index: number) {
    const line = watched[index];
    const product = line?.produitId ? selectedProducts[line.produitId] : undefined;
    if (!line || !product) {
      return null;
    }

    let stock = product.stockActuel;
    let cost = product.prixAchatMoyen;
    for (let previousIndex = 0; previousIndex <= index; previousIndex += 1) {
      const previous = watched[previousIndex];
      if (previous?.produitId !== product.id) {
        continue;
      }
      const quantity = Number(previous.quantite) || 0;
      const purchasePrice = Number(previous.prixAchatUnitaire) || 0;
      const nextStock = stock + quantity;
      cost =
        stock <= 0 || cost == null
          ? purchasePrice
          : (stock * cost + quantity * purchasePrice) / nextStock;
      stock = nextStock;
    }
    return cost;
  }

  function selectWholesaler(wholesaler: Grossiste) {
    setSelectedWholesaler(wholesaler);
    setWholesalerSearch(wholesaler.nom);
    setWholesalerListOpen(false);
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
      } else if (wholesalers.data.content.length === 0) {
        setWholesalerModal(true);
      }
    }
    if (event.key === 'Escape' && !selectedWholesaler) {
      setWholesalerListOpen(false);
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
            <div
              className="supplier-picker"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setWholesalerListOpen(false);
                }
              }}
            >
              <Field
                aria-autocomplete="list"
                aria-controls={
                  wholesalerListOpen && wholesalers.data?.content.length
                    ? 'grossiste-options'
                    : undefined
                }
                aria-expanded={wholesalerListOpen && !selectedWholesaler}
                aria-haspopup="listbox"
                label="Grossiste"
                name="grossiste-search"
                value={wholesalerSearch}
                onFocus={() => {
                  if (selectedWholesaler) {
                    setSelectedWholesaler(null);
                    setWholesalerSearch('');
                    form.setValue('grossisteId', '');
                  }
                  setWholesalerListOpen(true);
                }}
                onChange={(event) => {
                  setWholesalerSearch(event.target.value);
                  setSelectedWholesaler(null);
                  setWholesalerListOpen(true);
                  form.setValue('grossisteId', '');
                }}
                onKeyDown={handleWholesalerKeyDown}
                placeholder="Chercher par nom…"
                autoComplete="off"
                required
                error={form.formState.errors.grossisteId?.message}
              />
              {wholesalerListOpen && !selectedWholesaler && (
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
                    <DeliveryProductPicker
                      id={`delivery-product-${row.id}`}
                      lineNumber={index + 1}
                      value={watched[index]?.produitId || ''}
                      error={form.formState.errors.lignes?.[index]?.produitId?.message}
                      onProductSelect={(product) => {
                        setSelectedProducts((current) => ({ ...current, [product.id]: product }));
                      }}
                      onChange={(productId) =>
                        form.setValue(`lignes.${index}.produitId`, productId, {
                          shouldDirty: true,
                          shouldValidate: Boolean(productId),
                        })
                      }
                    />
                    <NumberField
                      control={form.control}
                      label="Quantité reçue"
                      name={`lignes.${index}.quantite`}
                      min={1}
                      step={1}
                      required
                      error={form.formState.errors.lignes?.[index]?.quantite?.message}
                    />
                    <NumberField
                      control={form.control}
                      label="Prix d'achat unitaire"
                      name={`lignes.${index}.prixAchatUnitaire`}
                      min={0.01}
                      step={0.01}
                      decimal
                      required
                      error={form.formState.errors.lignes?.[index]?.prixAchatUnitaire?.message}
                    />
                  </div>
                  {selectedProducts[watched[index]?.produitId] && (
                    <div className="delivery-cost-preview" aria-live="polite">
                      {(() => {
                        const product = selectedProducts[watched[index].produitId];
                        const projected = projectedCost(index);
                        const salePrice = watched[index]?.mettreAJourPrixVente
                          ? watched[index]?.nouveauPrixVente
                          : product.prixVente;
                        const margin =
                          projected && salePrice
                            ? ((salePrice - projected) / projected) * 100
                            : null;
                        return (
                          <>
                            <span>Catégorie : {product.categorieLibelle}</span>
                            <span>Stock actuel : {product.stockActuel}</span>
                            {admin && (
                              <>
                                <span>
                                  CMUP actuel :{' '}
                                  {product.prixAchatMoyen == null
                                    ? 'Non renseigné'
                                    : money(product.prixAchatMoyen)}
                                </span>
                                <span>Prix de vente : {money(product.prixVente)}</span>
                                <span>
                                  CMUP après arrivage :{' '}
                                  {projected == null ? 'Calcul indisponible' : money(projected)}
                                </span>
                                <span>
                                  Marge prévisionnelle :{' '}
                                  {margin == null
                                    ? 'Indisponible'
                                    : `${percentageFormatter.format(margin)} %`}
                                </span>
                                {margin != null && margin < 0 && (
                                  <strong className="delivery-cost-warning" role="status">
                                    Avertissement : le prix de vente est inférieur au coût moyen.
                                  </strong>
                                )}
                                <label className="delivery-price-update">
                                  <input
                                    type="checkbox"
                                    {...form.register(`lignes.${index}.mettreAJourPrixVente`)}
                                  />
                                  Mettre à jour le prix de vente
                                </label>
                                {watched[index]?.mettreAJourPrixVente && (
                                  <NumberField
                                    control={form.control}
                                    decimal
                                    error={
                                      form.formState.errors.lignes?.[index]?.nouveauPrixVente
                                        ?.message
                                    }
                                    label="Nouveau prix de vente"
                                    min={0.01}
                                    name={`lignes.${index}.nouveauPrixVente`}
                                    step={0.01}
                                    required
                                  />
                                )}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
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
            disabled={save.isPending || products.isLoading || !form.formState.isValid}
          >
            {save.isPending ? 'Enregistrement…' : 'Valider l’arrivage'}
          </Button>
          {incompleteMessage && (
            <p className="field-error" role="status">
              {incompleteMessage}
            </p>
          )}
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
              required
              {...wholesalerForm.register('nom')}
              error={wholesalerForm.formState.errors.nom?.message}
            />
            <Controller
              control={wholesalerForm.control}
              name="telephone"
              render={({ field, fieldState }) => (
                <PhoneField
                  label="Téléphone"
                  name={field.name}
                  value={field.value || ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  error={fieldState.error?.message}
                />
              )}
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
              required
              {...productForm.register('nom')}
              error={productForm.formState.errors.nom?.message}
            />
            <Field
              label="Description"
              {...productForm.register('description')}
              error={productForm.formState.errors.description?.message}
            />
            <CategoryField
              value={productForm.watch('categorieId')}
              onChange={(value) =>
                productForm.setValue('categorieId', value, { shouldValidate: true })
              }
              error={productForm.formState.errors.categorieId?.message}
              admin
            />
            <NumberField
              control={productForm.control}
              label="Prix de vente"
              name="prixVente"
              min={0.01}
              step={0.01}
              decimal
              required
              error={productForm.formState.errors.prixVente?.message}
            />
            <NumberField
              control={productForm.control}
              label="Prix d'achat"
              name="prixAchat"
              min={0.01}
              step={0.01}
              decimal
              required
              error={productForm.formState.errors.prixAchat?.message}
            />
            <NumberField
              control={productForm.control}
              label="Seuil d’alerte"
              name="seuilAlerte"
              min={0}
              step={1}
              required
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
