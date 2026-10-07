import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import {
  ActionFeedback,
  Button,
  ConfirmationModal,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
} from '../components/ui';
import { Heading, Pager } from '../components/layout';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import { categorySchema, type CategoryValues } from '../schemas/forms';
import type { Category } from '../types';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Category | null | false>(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { libelle: '' },
  });
  const categories = useQuery({
    queryKey: ['categories', page, search],
    queryFn: () => api.categories(page, search, 10),
  });
  const save = useMutation({
    mutationFn: (values: CategoryValues) =>
      editing ? api.updateCategory(editing.id, values) : api.createCategory(values),
    onSuccess: async (category) => {
      setEditing(false);
      setFeedback({ tone: 'success', message: `Catégorie « ${category.libelle} » enregistrée.` });
      form.reset({ libelle: '' });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: async () => {
      setDeleting(null);
      setFeedback({ tone: 'success', message: 'Catégorie supprimée.' });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      setDeleting(null);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });

  function openEditor(category: Category | null) {
    setFeedback(null);
    setEditing(category);
    form.reset({ libelle: category?.libelle || '' });
  }

  return (
    <>
      <Heading
        kicker="CATALOGUE · ORGANISATION"
        title="Catégories"
        aside={
          <Button className="primary" onClick={() => openEditor(null)}>
            Nouvelle catégorie
          </Button>
        }
      />
      <section className="category-register" aria-labelledby="category-list-title">
        <div className="category-register-heading">
          <div>
            <h2 id="category-list-title">Classement des produits</h2>
            <p className="muted">Les catégories servent à organiser et filtrer le catalogue.</p>
          </div>
          <Field
            label="Rechercher une catégorie"
            name="category-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Ex. boissons"
          />
        </div>
        {categories.isLoading ? (
          <LoadingState label="Chargement des catégories…" />
        ) : categories.error ? (
          <ErrorState error={categories.error} />
        ) : categories.data?.content.length ? (
          <>
            <DataTable
              className="categories-table"
              headers={['LIBELLÉ', 'PRODUITS ASSOCIÉS', 'ACTIONS']}
            >
              {categories.data.content.map((category) => (
                <tr key={category.id}>
                  <td>
                    <strong>{category.libelle}</strong>
                  </td>
                  <td className="right mono">{category.nombreProduits}</td>
                  <td className="table-actions">
                    <IconButton
                      icon="edit"
                      label={`Modifier ${category.libelle}`}
                      onClick={() => openEditor(category)}
                    />
                    <IconButton
                      icon="trash"
                      label={`Supprimer ${category.libelle}`}
                      onClick={() => setDeleting(category)}
                    />
                  </td>
                </tr>
              ))}
            </DataTable>
            <Pager page={page} pages={categories.data.page.totalPages} setPage={setPage} />
          </>
        ) : (
          <EmptyState>Aucune catégorie ne correspond à cette recherche.</EmptyState>
        )}
      </section>
      {editing !== false && (
        <Modal
          title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          onClose={() => setEditing(false)}
        >
          <form
            className="editor-form"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            noValidate
          >
            <Field
              label="Libellé"
              required
              autoFocus
              {...form.register('libelle')}
              error={form.formState.errors.libelle?.message}
            />
            <Button className="primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmationModal
          title="Supprimer cette catégorie ?"
          description={
            <>
              La catégorie <strong>{deleting.libelle}</strong> ne peut être supprimée que si elle ne
              contient aucun produit.
            </>
          }
          confirmLabel="Supprimer la catégorie"
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id)}
          pending={remove.isPending}
          danger
        />
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
