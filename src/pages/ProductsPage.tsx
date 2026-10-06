import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { api } from '../api';
import {
  ActionFeedback,
  Button,
  ConfirmationModal,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FormattedNumberField,
  IconButton,
  LoadingState,
  Modal,
  NumberField,
  SelectField,
  Tag,
} from '../components/ui';
import { Heading, Pager } from '../components/layout';
import { applyApiFieldErrors, apiErrorMessage } from '../forms';
import { productSchema, productUpdateSchema, type ProductValues } from '../schemas/forms';
import type { Product, ProductRequest, ProductUpdateRequest, Role, TopProduct } from '../types';
import { money } from '../utils';

const emptyProduct: ProductValues = {
  nom: '',
  description: '',
  prixVente: 0,
  prixAchat: 0,
  stockActuel: 0,
  seuilAlerte: 5,
};

export function ProductsPage({ role }: { role: Role }) {
  const admin = role === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [minimumPrice, setMinimumPrice] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [minimumPriceFilter, setMinimumPriceFilter] = useState('');
  const [maximumPriceFilter, setMaximumPriceFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [sort, setSort] = useState('creerDate,desc');
  const [page, setPage] = useState(0);
  const [demandPage, setDemandPage] = useState(0);
  const [view, setView] = useState<'catalogue' | 'demandes'>('catalogue');
  const [editing, setEditing] = useState<Product | null | false>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(0);
      setDemandPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumPriceFilter(minimumPrice);
      setMaximumPriceFilter(maximumPrice);
      setPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [minimumPrice, maximumPrice]);

  const products = useQuery({
    queryKey: ['products', page, term, minimumPriceFilter, maximumPriceFilter, stockFilter, sort],
    queryFn: () =>
      api.products(page, term, 10, stockFilter === 'low', {
        stockMaximum: stockFilter === 'out' ? '0' : undefined,
        prixMinimum: minimumPriceFilter || undefined,
        prixMaximum: maximumPriceFilter || undefined,
        sort,
      }),
  });
  const topProducts = useQuery({
    queryKey: ['top-products', 'products-page'],
    queryFn: () => api.topProducts(100),
    enabled: view === 'demandes',
  });
  const form = useForm<ProductValues>({
    resolver: (editing
      ? zodResolver(productUpdateSchema)
      : zodResolver(productSchema)) as Resolver<ProductValues>,
    defaultValues: emptyProduct,
  });
  const save = useMutation({
    mutationFn: (request: ProductRequest | ProductUpdateRequest) =>
      editing
        ? api.updateProduct(editing.id, request as ProductUpdateRequest)
        : api.createProduct(request as ProductRequest),
    onSuccess: () => {
      setEditing(false);
      setFeedback({ tone: 'success', message: 'Produit enregistré. Le rayon est à jour.' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      setProductToDelete(null);
      setFeedback({ tone: 'success', message: 'Produit supprimé.' });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
    },
    onError: (error) => {
      setProductToDelete(null);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });

  function openProduct(product: Product | null) {
    setFeedback(null);
    setEditing(product);
    form.reset(
      product
        ? {
            nom: product.nom,
            description: product.description || '',
            prixVente: product.prixVente,
            prixAchat: 0,
            stockActuel: product.stockActuel,
            seuilAlerte: product.seuilAlerte,
          }
        : emptyProduct,
    );
  }

  const submit = form.handleSubmit((values) => {
    if (editing) {
      const request: ProductUpdateRequest = {
        nom: values.nom,
        description: values.description,
        prixVente: values.prixVente,
        stockActuel: values.stockActuel,
        seuilAlerte: values.seuilAlerte,
      };
      save.mutate(request);
      return;
    }

    save.mutate(values);
  });
  const rankedProducts = (topProducts.data || []).filter((item: TopProduct) =>
    item.produit.toLocaleLowerCase('fr-FR').includes(term.toLocaleLowerCase('fr-FR')),
  );
  const visibleDemandProducts = rankedProducts.slice(demandPage * 10, (demandPage + 1) * 10);

  return (
    <>
      <Heading
        kicker="INVENTAIRE · REGISTRE DES RAYONS"
        title="Les produits"
        aside={
          admin ? (
            <Button className="primary" onClick={() => openProduct(null)}>
              Ajouter un produit +
            </Button>
          ) : (
            <Tag>LECTURE RAYONS</Tag>
          )
        }
      />
      <div className="register-tabs product-view-tabs" role="tablist" aria-label="Vue des produits">
        <button
          aria-selected={view === 'catalogue'}
          className={view === 'catalogue' ? 'active' : ''}
          onClick={() => setView('catalogue')}
          role="tab"
          type="button"
        >
          Catalogue
        </button>
        <button
          aria-selected={view === 'demandes'}
          className={view === 'demandes' ? 'active' : ''}
          onClick={() => {
            setView('demandes');
            setDemandPage(0);
          }}
          role="tab"
          type="button"
        >
          Les plus demandés
        </button>
      </div>
      <div className="toolbar product-search-row">
        <Field
          label={view === 'catalogue' ? 'Chercher un produit' : 'Chercher parmi les plus demandés'}
          name="product-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex. tomate, riz…"
        />
        <span className="small muted">Recherche au fil de la saisie</span>
      </div>
      {view === 'catalogue' && (
        <div className="product-filters" role="group" aria-label="Filtres des produits">
          <div
            className="register-tabs product-stock-tabs"
            role="group"
            aria-label="Filtrer par stock"
          >
            <button
              aria-pressed={stockFilter === 'all'}
              className={stockFilter === 'all' ? 'active' : ''}
              onClick={() => {
                setStockFilter('all');
                setPage(0);
              }}
              type="button"
            >
              Tous les stocks
            </button>
            <button
              aria-pressed={stockFilter === 'low'}
              className={stockFilter === 'low' ? 'active' : ''}
              onClick={() => {
                setStockFilter('low');
                setPage(0);
              }}
              type="button"
            >
              Stock bas
            </button>
            <button
              aria-pressed={stockFilter === 'out'}
              className={stockFilter === 'out' ? 'active' : ''}
              onClick={() => {
                setStockFilter('out');
                setPage(0);
              }}
              type="button"
            >
              Rupture
            </button>
          </div>
          <FormattedNumberField
            label="Prix minimum"
            decimal
            onValueChange={setMinimumPrice}
            placeholder="Sans minimum"
            value={minimumPrice}
          />
          <FormattedNumberField
            label="Prix maximum"
            decimal
            onValueChange={setMaximumPrice}
            placeholder="Sans maximum"
            value={maximumPrice}
          />
          <SelectField
            className="filter-field"
            label="Trier par"
            name="product-sort"
            onChange={(event) => {
              setSort(event.target.value);
              setPage(0);
            }}
            value={sort}
          >
            <option value="creerDate,desc">Les plus récents</option>
            <option value="creerDate,asc">Les plus anciens</option>
            <option value="nom,asc">Nom A à Z</option>
            <option value="prixVente,asc">Prix croissant</option>
            <option value="prixVente,desc">Prix décroissant</option>
            <option value="stockActuel,asc">Stock croissant</option>
            <option value="stockActuel,desc">Stock décroissant</option>
          </SelectField>
        </div>
      )}
      {view === 'demandes' ? (
        topProducts.isLoading ? (
          <LoadingState label="Classement des ventes en cours…" />
        ) : topProducts.error ? (
          <ErrorState error={topProducts.error} />
        ) : visibleDemandProducts.length ? (
          <>
            <p className="product-demand-note">
              Classement cumulé selon les quantités vendues, fourni par les statistiques du serveur.
            </p>
            <DataTable
              className="product-demand-table"
              headers={['RANG', 'PRODUIT', 'UNITÉS VENDUES', 'CHIFFRE D’AFFAIRES']}
            >
              {visibleDemandProducts.map((item, index) => (
                <tr key={item.produitId}>
                  <td className="mono">{demandPage * 10 + index + 1}</td>
                  <td>
                    <strong>{item.produit}</strong>
                  </td>
                  <td className="right amount">{item.quantiteVendue}</td>
                  <td className="right mono">{money(item.chiffreAffaires)}</td>
                </tr>
              ))}
            </DataTable>
            <Pager
              page={demandPage}
              pages={Math.ceil(rankedProducts.length / 10)}
              setPage={setDemandPage}
            />
          </>
        ) : (
          <EmptyState>Aucune vente ne correspond à cette recherche.</EmptyState>
        )
      ) : products.isLoading ? (
        <LoadingState label="On compte les produits…" />
      ) : products.error ? (
        <ErrorState error={products.error} />
      ) : products.data?.content.length ? (
        <DataTable
          className={
            admin ? 'products-table products-table-admin' : 'products-table products-table-vendeur'
          }
          headers={[
            'PRODUIT',
            'PRIX DE VENTE',
            ...(admin ? ['CMUP', 'MARGE'] : []),
            'STOCK',
            ...(admin ? ['ACTIONS'] : []),
          ]}
        >
          {products.data.content.map((product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.nom}</strong>
                <small className="table-subline">{product.description}</small>
              </td>
              <td className="right mono">{money(product.prixVente)}</td>
              {admin && (
                <>
                  <td className="right mono">
                    {product.prixAchatMoyen == null ? '—' : money(product.prixAchatMoyen)}
                  </td>
                  <td className="right mono">
                    {product.prixAchatMoyen == null || product.prixAchatMoyen === 0
                      ? '—'
                      : `${(
                          ((product.prixVente - product.prixAchatMoyen) / product.prixAchatMoyen) *
                          100
                        ).toFixed(1)} %`}
                  </td>
                </>
              )}
              <td className="right">
                <Tag danger={product.stockActuel <= product.seuilAlerte}>
                  {product.stockActuel} en rayon
                </Tag>
              </td>
              {admin && (
                <td className="row-actions">
                  <IconButton
                    icon="edit"
                    label={`Modifier ${product.nom}`}
                    onClick={() => openProduct(product)}
                  />
                  <IconButton
                    className="danger-icon"
                    icon="trash"
                    label={`Supprimer ${product.nom}`}
                    onClick={() => setProductToDelete(product)}
                  />
                </td>
              )}
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>Aucun produit dans ce rayon.</EmptyState>
      )}
      <Pager page={page} pages={products.data?.page.totalPages || 0} setPage={setPage} />
      {productToDelete && (
        <ConfirmationModal
          title="Supprimer ce produit ?"
          description={
            <>
              Le produit <strong>{productToDelete.nom}</strong> sera supprimé. Cette action ne peut
              pas être annulée.
            </>
          }
          confirmLabel="Supprimer le produit"
          onCancel={() => setProductToDelete(null)}
          onConfirm={() => remove.mutate(productToDelete.id)}
          pending={remove.isPending}
          danger
        />
      )}
      {editing !== false && (
        <Modal
          title={editing ? 'Modifier le produit' : 'Nouvelle étiquette'}
          description="Renseignez les informations du produit et vérifiez son stock avant validation."
          onClose={() => setEditing(false)}
        >
          <form className="editor-form" onSubmit={submit} noValidate>
            <Field
              label="Nom"
              {...form.register('nom')}
              error={form.formState.errors.nom?.message}
            />
            <Field
              label="Description"
              {...form.register('description')}
              error={form.formState.errors.description?.message}
            />
            <NumberField
              control={form.control}
              label="Prix de vente"
              min={0.01}
              step={0.01}
              decimal
              name="prixVente"
              error={form.formState.errors.prixVente?.message}
            />
            {!editing && (
              <NumberField
                control={form.control}
                label="Prix d'achat"
                min={0.01}
                step={0.01}
                decimal
                required
                name="prixAchat"
                error={form.formState.errors.prixAchat?.message}
              />
            )}
            <NumberField
              control={form.control}
              label="Stock actuel"
              name="stockActuel"
              min={0}
              step={1}
              error={form.formState.errors.stockActuel?.message}
            />
            <NumberField
              control={form.control}
              label="Seuil d’alerte"
              name="seuilAlerte"
              min={0}
              step={1}
              error={form.formState.errors.seuilAlerte?.message}
            />
            <Button className="primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer le produit'}
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
