import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Button, ErrorState, Field, LoadingState, Modal } from '../components/ui';
import { Heading } from '../components/layout';
import { applyApiFieldErrors } from '../forms';
import { deliverySchema, wholesalerSchema, type DeliveryValues } from '../schemas/forms';
import type { Grossiste, GrossisteRequest, Product } from '../types';
import { money } from '../utils';

export function DeliveriesPage() {
  const queryClient = useQueryClient();
  const [wholesalerSearch, setWholesalerSearch] = useState('');
  const [selectedWholesaler, setSelectedWholesaler] = useState<Grossiste | null>(null);
  const [wholesalerModal, setWholesalerModal] = useState(false);
  const [success, setSuccess] = useState('');
  const products = useQuery({
    queryKey: ['products', 'delivery'],
    queryFn: () => api.products(0, '', 100),
  });
  const wholesalers = useQuery({
    queryKey: ['wholesalers', wholesalerSearch],
    queryFn: () => api.wholesalers(wholesalerSearch),
  });
  const form = useForm<DeliveryValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      grossisteId: '',
      lignes: [{ produitId: '', quantite: 1, prixAchatUnitaire: 0 }],
    },
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
  const submit = form.handleSubmit((values) => {
    setSuccess('');
    save.mutate(values);
  });

  return (
    <>
      <Heading kicker="RÉAPPROVISIONNEMENT · ENTRÉE DE STOCK" title="Les arrivages" />
      <form className="delivery-form" onSubmit={submit} noValidate>
        <div className="supplier-picker">
          <Field
            label="Grossiste"
            name="grossiste-search"
            value={wholesalerSearch}
            onChange={(event) => {
              setWholesalerSearch(event.target.value);
              setSelectedWholesaler(null);
              form.setValue('grossisteId', '');
            }}
            placeholder="Chercher par nom…"
            autoComplete="off"
            error={form.formState.errors.grossisteId?.message}
          />
          {wholesalerSearch &&
            !selectedWholesaler &&
            wholesalers.data?.content.map((wholesaler) => (
              <button
                type="button"
                className="suggestion"
                key={wholesaler.id}
                onClick={() => {
                  setSelectedWholesaler(wholesaler);
                  setWholesalerSearch(wholesaler.nom);
                  form.setValue('grossisteId', wholesaler.id, { shouldValidate: true });
                }}
              >
                {wholesaler.nom}
                <small>{wholesaler.telephone}</small>
              </button>
            ))}
          {wholesalerSearch && !wholesalers.isLoading && wholesalers.data?.content.length === 0 && (
            <button type="button" className="text-button" onClick={() => setWholesalerModal(true)}>
              Créer cette fiche grossiste +
            </button>
          )}
        </div>
        <h2>Marchandises reçues</h2>
        {products.isLoading ? (
          <LoadingState label="Lecture du catalogue…" />
        ) : products.error ? (
          <ErrorState error={products.error} />
        ) : (
          rowList.fields.map((row, index) => (
            <div className="delivery-line" key={row.id}>
              <label className="field-wrap">
                <span className="field-label">Produit</span>
                <select
                  className="field-select"
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
              </label>
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
    </>
  );
}
