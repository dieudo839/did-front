import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Heading } from '../components/layout';
import { Receipt } from '../components/Receipt';
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal } from '../components/ui';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import { clientSchema, purchaseSchema, type PurchaseValues } from '../schemas/forms';
import type { Client, ClientRequest, Product, Ticket } from '../types';
import { localDateTime, money } from '../utils';

export function CheckoutPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [search, setSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Product>>({});
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState('');
  const [clientModal, setClientModal] = useState(false);
  const productsQuery = useQuery({
    queryKey: ['products', 'checkout', search],
    queryFn: () => api.products(0, search, 100),
  });
  const clientsQuery = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: () => api.clients(clientSearch),
  });
  const form = useForm<PurchaseValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { clientId: null, lignes: [] },
  });
  const lines = useFieldArray({ control: form.control, name: 'lignes' });
  const watchedLines = useWatch({ control: form.control, name: 'lignes' }) || [];
  const totalIndicatif = useMemo(
    () =>
      watchedLines.reduce((total, line) => {
        const product = selectedProducts[line.produitId];
        return total + (product?.prixVente || 0) * (line.quantite || 0);
      }, 0),
    [selectedProducts, watchedLines],
  );
  const sale = useMutation({
    mutationFn: (values: PurchaseValues) => api.createPurchase(values),
    onSuccess: async (purchase) => {
      form.reset({ clientId: null, lignes: [] });
      setSelectedClient(null);
      setSelectedProducts({});
      setMessage('Vente enregistrée. Le serveur a calculé le total définitif.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
      try {
        setTicket(await api.ticket(purchase.id));
      } catch (error) {
        setMessage(
          `Vente enregistrée, mais le ticket n'a pas pu être chargé. ${apiErrorMessage(error)}`,
        );
      }
    },
    onError: (error) => applyApiFieldErrors(error, form.setError),
  });
  const clientCreate = useForm<ClientRequest>({
    resolver: zodResolver(clientSchema),
    defaultValues: { nom: '', prenom: '', telephone: '' },
  });
  const createClient = useMutation({
    mutationFn: (body: ClientRequest) => api.createClient(body),
    onSuccess: (client) => {
      setSelectedClient(client);
      form.setValue('clientId', client.id);
      setClientSearch(`${client.prenom || ''} ${client.nom}`.trim());
      setClientModal(false);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      clientCreate.reset();
    },
    onError: (error) => applyApiFieldErrors(error, clientCreate.setError),
  });

  function addProduct(product: Product) {
    setSelectedProducts((current) => ({ ...current, [product.id]: product }));
    const existingIndex = watchedLines.findIndex((line) => line.produitId === product.id);
    if (existingIndex >= 0) {
      form.setValue(`lignes.${existingIndex}.quantite`, watchedLines[existingIndex]!.quantite + 1, {
        shouldValidate: true,
      });
    } else {
      lines.append({ produitId: product.id, quantite: 1 });
    }
  }

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        document.getElementById('product-search')?.focus();
      }
      if (event.key === 'F4') {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  const submit = form.handleSubmit((values) => {
    setMessage('');
    sale.mutate(values);
  });

  async function downloadTicket() {
    if (!ticket) return;
    try {
      const blob = await api.ticketPdf(ticket.achatId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'ticket-de-caisse.pdf';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(apiErrorMessage(error));
    }
  }

  return (
    <>
      <Heading
        kicker="ENCAISSEMENT · CLIENT COMPTOIR"
        title="La caisse"
        aside={<span className="key-hint">F2 recherche · F4 valider</span>}
      />
      {ticket ? (
        <div className="sale-result">
          <div className="sale-confirmation">
            <span className="paid-stamp" aria-label="Paiement accepté">
              PAYÉ
            </span>
            <h2>Le ticket est sorti.</h2>
            <p>
              Vente du {localDateTime(ticket.dateAchat)} · {money(ticket.total)}
            </p>
            <Button className="primary" onClick={() => window.print()}>
              Imprimer le ticket
            </Button>
            <Button onClick={downloadTicket}>Télécharger le PDF</Button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setTicket(null);
                setMessage('');
              }}
            >
              Nouvelle vente ↗
            </button>
          </div>
          <Receipt ticket={ticket} />
        </div>
      ) : (
        <form className="checkout-grid" ref={formRef} onSubmit={submit} noValidate>
          <section className="pick-products">
            <Field
              label="Rechercher et ajouter"
              id="product-search"
              name="product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom du produit… (F2)"
              autoComplete="off"
            />
            {productsQuery.isLoading ? (
              <LoadingState label="Recherche dans le rayon…" />
            ) : productsQuery.error ? (
              <ErrorState error={productsQuery.error} />
            ) : productsQuery.data?.content.length ? (
              <div className="product-picks" aria-label="Résultats produits">
                {productsQuery.data.content.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="pick"
                    disabled={!product.stockActuel}
                    onClick={() => addProduct(product)}
                  >
                    <span>
                      {product.nom}
                      <small>{product.stockActuel} en stock</small>
                    </span>
                    <b>{money(product.prixVente)} ＋</b>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>Aucun produit trouvé dans le rayon.</EmptyState>
            )}
          </section>

          <section className="basket">
            <p className="eyebrow">
              LE PANIER · {watchedLines.reduce((sum, line) => sum + (line.quantite || 0), 0)}{' '}
              ARTICLES
            </p>
            <h2>À régler</h2>
            <div className="customer-picker">
              <Field
                label="Client (facultatif)"
                name="client-search"
                value={clientSearch}
                onChange={(event) => {
                  setClientSearch(event.target.value);
                  setSelectedClient(null);
                  form.setValue('clientId', null);
                }}
                placeholder="Client comptoir"
                autoComplete="off"
              />
              {clientSearch &&
                !selectedClient &&
                clientsQuery.data?.content.map((client) => (
                  <button
                    key={client.id}
                    className="suggestion"
                    type="button"
                    onClick={() => {
                      setSelectedClient(client);
                      form.setValue('clientId', client.id);
                      setClientSearch(`${client.prenom || ''} ${client.nom}`.trim());
                    }}
                  >
                    {client.prenom} {client.nom} <small>{client.telephone}</small>
                  </button>
                ))}
              {clientSearch &&
                !clientsQuery.isLoading &&
                clientsQuery.data?.content.length === 0 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setClientModal(true)}
                  >
                    Créer cette fiche client +
                  </button>
                )}
              {form.formState.errors.clientId?.message && (
                <p className="field-error" role="alert">
                  {form.formState.errors.clientId.message}
                </p>
              )}
            </div>
            {lines.fields.length === 0 ? (
              <EmptyState>Ajoutez un produit depuis le rayon.</EmptyState>
            ) : (
              <div className="basket-lines">
                {lines.fields.map((line, index) => {
                  const product = selectedProducts[line.produitId];
                  return (
                    <div className="basket-line" key={line.id}>
                      <span>
                        {product?.nom || 'Article'}
                        <small>{money(product?.prixVente || 0)} / unité</small>
                      </span>
                      <Field
                        label="Qté"
                        aria-label={`Quantité ${product?.nom || 'de cet article'}`}
                        type="number"
                        min="1"
                        max={product?.stockActuel}
                        {...form.register(`lignes.${index}.quantite`, { valueAsNumber: true })}
                        error={form.formState.errors.lignes?.[index]?.quantite?.message}
                      />
                      <b className="mono">
                        {money((product?.prixVente || 0) * (watchedLines[index]?.quantite || 0))}
                      </b>
                      <button
                        type="button"
                        aria-label={`Retirer ${product?.nom || 'ce produit'}`}
                        onClick={() => lines.remove(index)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {form.formState.errors.lignes?.root?.message && (
              <p className="field-error" role="alert">
                {form.formState.errors.lignes.root.message}
              </p>
            )}
            <div className="basket-total">
              <span>TOTAL INDICATIF</span>
              <strong>{money(totalIndicatif)}</strong>
            </div>
            {sale.isError && <ErrorState error={sale.error} />}
            {message && (
              <p className="success" role="status">
                {message}
              </p>
            )}
            <Button
              className="primary full"
              type="submit"
              disabled={!lines.fields.length || sale.isPending}
            >
              {sale.isPending ? 'Enregistrement…' : 'Valider la vente · F4'}
            </Button>
            <p className="small muted">
              Le prix et le total définitifs sont calculés par le serveur.
            </p>
          </section>
        </form>
      )}

      {clientModal && (
        <Modal title="Nouvelle fiche client" onClose={() => setClientModal(false)}>
          <form
            className="editor-form"
            onSubmit={clientCreate.handleSubmit((values) => createClient.mutate(values))}
            noValidate
          >
            <Field
              label="Nom"
              {...clientCreate.register('nom')}
              error={clientCreate.formState.errors.nom?.message}
            />
            <Field
              label="Prénom"
              {...clientCreate.register('prenom')}
              error={clientCreate.formState.errors.prenom?.message}
            />
            <Field
              label="Téléphone"
              {...clientCreate.register('telephone')}
              error={clientCreate.formState.errors.telephone?.message}
            />
            {createClient.isError && <ErrorState error={createClient.error} />}
            <Button className="primary" type="submit" disabled={createClient.isPending}>
              Créer le client
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}
