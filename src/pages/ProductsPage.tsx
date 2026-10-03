import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Modal,
  Tag,
} from '../components/ui';
import { Heading, Pager } from '../components/layout';
import { applyApiFieldErrors, apiErrorMessage } from '../forms';
import { productSchema, type ProductValues } from '../schemas/forms';
import type { Product, ProductRequest, Role } from '../types';
import { money } from '../utils';

const emptyProduct: ProductValues = {
  nom: '',
  description: '',
  prixVente: 0,
  stockActuel: 0,
  seuilAlerte: 5,
  categorieId: null,
};

export function ProductsPage({ role }: { role: Role }) {
  const admin = role === 'ADMIN';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Product | null | false>(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(0);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  const products = useQuery({
    queryKey: ['products', page, term],
    queryFn: () => api.products(page, term),
  });
  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct,
  });
  const save = useMutation({
    mutationFn: (values: ProductRequest) =>
      editing ? api.updateProduct(editing.id, values) : api.createProduct(values),
    onSuccess: () => {
      setEditing(false);
      setMessage('Produit enregistré. Le rayon est à jour.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => applyApiFieldErrors(error, form.setError),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (error) => setMessage(apiErrorMessage(error)),
  });

  function openProduct(product: Product | null) {
    setMessage('');
    setEditing(product);
    form.reset(
      product
        ? {
            nom: product.nom,
            description: product.description || '',
            prixVente: product.prixVente,
            stockActuel: product.stockActuel,
            seuilAlerte: product.seuilAlerte,
            categorieId: product.categorieId,
          }
        : emptyProduct,
    );
  }

  const submit = form.handleSubmit((values) => {
    const request: ProductRequest = { ...values };
    save.mutate(request);
  });

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
      <div className="toolbar">
        <Field
          label="Chercher un produit"
          name="product-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ex. tomate, riz…"
        />
        <span className="small muted">Recherche au fil de la saisie</span>
      </div>
      {message && (
        <p className="success form-message" role="status">
          {message}
        </p>
      )}
      {products.isLoading ? (
        <LoadingState label="On compte les produits…" />
      ) : products.error ? (
        <ErrorState error={products.error} />
      ) : products.data?.content.length ? (
        <DataTable headers={['PRODUIT', 'FAMILLE', 'PRIX', 'STOCK', ...(admin ? ['GESTE'] : [])]}>
          {products.data.content.map((product) => (
            <tr key={product.id}>
              <td>
                <strong>{product.nom}</strong>
                <small className="table-subline">{product.description}</small>
              </td>
              <td>{product.categorie || '—'}</td>
              <td className="right mono">{money(product.prixVente)}</td>
              <td className="right">
                <Tag danger={product.stockActuel <= product.seuilAlerte}>
                  {product.stockActuel} en rayon
                </Tag>
              </td>
              {admin && (
                <td className="row-actions">
                  <button type="button" onClick={() => openProduct(product)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.confirm(`Supprimer ${product.nom} ?`) && remove.mutate(product.id)
                    }
                  >
                    Supprimer
                  </button>
                </td>
              )}
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>Aucun produit dans ce rayon.</EmptyState>
      )}
      <Pager page={page} pages={products.data?.totalPages || 0} setPage={setPage} />
      {editing !== false && (
        <Modal
          title={editing ? 'Modifier le produit' : 'Nouvelle étiquette'}
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
            <Field
              label="Prix de vente"
              type="number"
              min="0.01"
              step="0.01"
              {...form.register('prixVente', { valueAsNumber: true })}
              error={form.formState.errors.prixVente?.message}
            />
            <Field
              label="Stock actuel"
              type="number"
              min="0"
              step="1"
              {...form.register('stockActuel', { valueAsNumber: true })}
              error={form.formState.errors.stockActuel?.message}
            />
            <Field
              label="Seuil d’alerte"
              type="number"
              min="0"
              step="1"
              {...form.register('seuilAlerte', { valueAsNumber: true })}
              error={form.formState.errors.seuilAlerte?.message}
            />
            {save.isError && <ErrorState error={save.error} />}
            <Button className="primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer le produit'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
