import { useEffect, useId, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import { categorySchema, type CategoryValues } from '../schemas/forms';
import type { Category } from '../types';
import { Button, Field, Modal, RequiredMark } from './ui';
import './CategoryField.css';

interface CategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  admin?: boolean;
  label?: string;
}

export function CategoryField({
  value,
  onChange,
  error,
  admin = false,
  label = 'Catégorie',
}: CategoryFieldProps) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => api.allCategories(),
  });
  const selected = categories.data?.find((category) => category.id === value);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const fieldId = useId();
  const optionsId = `${fieldId}-options`;
  const errorId = `${fieldId}-error`;
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { libelle: '' },
  });
  const options = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr-FR');
    return (categories.data || []).filter((category) =>
      category.libelle.toLocaleLowerCase('fr-FR').includes(term),
    );
  }, [categories.data, search]);
  const create = useMutation({
    mutationFn: (values: CategoryValues) => api.createCategory(values),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      onChange(category.id);
      setSearch(category.libelle);
      setFocused(false);
      setCreateOpen(false);
      form.reset({ libelle: '' });
    },
    onError: (submitError) => applyApiFieldErrors(submitError, form.setError),
  });

  useEffect(() => {
    if (!focused) {
      setSearch(selected?.libelle || '');
    }
  }, [focused, selected?.libelle]);

  function choose(category: Category) {
    onChange(category.id);
    setSearch(category.libelle);
    setFocused(false);
  }

  return (
    <>
      <div
        className="field-wrap category-field"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        <label className="field" htmlFor={fieldId}>
          <span className="field-label-row">
            <span>{label}</span>
            <RequiredMark />
          </span>
          <input
            id={fieldId}
            type="search"
            required
            aria-required="true"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={focused}
            aria-controls={optionsId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            value={focused ? search : selected?.libelle || search}
            placeholder={categories.isLoading ? 'Chargement…' : 'Rechercher une catégorie'}
            onFocus={() => {
              setSearch(selected?.libelle || '');
              setFocused(true);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              onChange('');
              setFocused(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && options.length > 0) {
                event.preventDefault();
                document.getElementById(`${optionsId}-0`)?.focus();
              }
              if (event.key === 'Enter' && focused && options.length > 0) {
                event.preventDefault();
                choose(options[0]!);
              }
              if (event.key === 'Escape') {
                setFocused(false);
              }
            }}
          />
        </label>
        {error && (
          <span className="field-error" id={errorId} role="alert">
            {error}
          </span>
        )}
        {focused && (
          <div className="category-options" id={optionsId} role="listbox">
            {categories.isLoading ? (
              <span className="category-option-message">Chargement des catégories…</span>
            ) : categories.isError ? (
              <span className="category-option-message">{apiErrorMessage(categories.error)}</span>
            ) : options.length ? (
              options.map((category, index) => (
                <button
                  id={`${optionsId}-${index}`}
                  key={category.id}
                  type="button"
                  role="option"
                  aria-selected={category.id === value}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      document.getElementById(`${optionsId}-${index + 1}`)?.focus();
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      if (index === 0) {
                        document.getElementById(fieldId)?.focus();
                      } else {
                        document.getElementById(`${optionsId}-${index - 1}`)?.focus();
                      }
                    }
                    if (event.key === 'Escape') {
                      setFocused(false);
                      document.getElementById(fieldId)?.focus();
                    }
                  }}
                  onClick={() => choose(category)}
                >
                  <span>{category.libelle}</span>
                  <small>{category.nombreProduits} produit(s)</small>
                </button>
              ))
            ) : (
              <span className="category-option-message">Aucune catégorie trouvée.</span>
            )}
            {admin && (
              <button
                className="category-create-option"
                type="button"
                onClick={() => {
                  form.reset({ libelle: search.trim() });
                  setCreateOpen(true);
                }}
              >
                Créer « {search.trim() || 'une catégorie'} »
              </button>
            )}
          </div>
        )}
      </div>
      {createOpen && (
        <Modal
          title="Nouvelle catégorie"
          description="La catégorie sera immédiatement disponible pour ce produit."
          onClose={() => setCreateOpen(false)}
        >
          <form
            className="editor-form"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
            noValidate
          >
            <Field
              label="Libellé"
              required
              autoFocus
              {...form.register('libelle')}
              error={form.formState.errors.libelle?.message}
            />
            {create.isError && (
              <p className="field-error" role="alert">
                {apiErrorMessage(create.error)}
              </p>
            )}
            <Button className="primary" type="submit" disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer la catégorie'}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
