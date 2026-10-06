import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Heading, Pager } from '../components/layout';
import { PhoneField } from '../components/PhoneField';
import { Receipt } from '../components/Receipt';
import {
  ActionFeedback,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Modal,
  NumberField,
  SelectField,
} from '../components/ui';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import { clientSchema, purchaseSchema, type PurchaseValues } from '../schemas/forms';
import type { Client, ClientRequest, Product, Ticket } from '../types';
import { localDateTime, money } from '../utils';

export function CheckoutPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [search, setSearch] = useState('');
  const [productPage, setProductPage] = useState(0);
  const [productPageSize, setProductPageSize] = useState(5);
  const [clientSearch, setClientSearch] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, Product>>({});
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [clientModal, setClientModal] = useState(false);
  const productsQuery = useQuery({
    queryKey: ['products', 'checkout', search, productPage, productPageSize],
    queryFn: () => api.products(productPage, search, productPageSize),
  });
  const clientsQuery = useQuery({
    queryKey: ['clients', clientSearch],
    queryFn: () => api.clients(clientSearch),
    enabled: clientPickerOpen && !selectedClient,
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['revenue'] });
      queryClient.invalidateQueries({ queryKey: ['top-products'] });
      try {
        setTicket(await api.ticket(purchase.id));
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: `La vente est enregistrée, mais le ticket n’a pas pu être chargé. ${apiErrorMessage(error)}`,
        });
      }
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
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
      setClientPickerOpen(false);
      setClientModal(false);
      setFeedback({ tone: 'success', message: `${client.nom} a été ajouté aux clients.` });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      clientCreate.reset();
    },
    onError: (error) => {
      applyApiFieldErrors(error, clientCreate.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });

  function openClientModal() {
    clientCreate.reset({ nom: '', prenom: '', telephone: '' });
    setClientPickerOpen(false);
    setClientModal(true);
  }

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

  function selectClient(client: Client) {
    setSelectedClient(client);
    form.setValue('clientId', client.id, { shouldValidate: true });
    setClientSearch(`${client.prenom || ''} ${client.nom}`.trim());
    setClientPickerOpen(false);
  }

  function handleClientKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    const options = document.querySelectorAll<HTMLButtonElement>('#client-options button');
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      options.item(0)?.focus();
    }
    if (event.key === 'Enter' && clientPickerOpen && !selectedClient) {
      event.preventDefault();
      const firstClient = clientsQuery.data?.content[0];
      if (firstClient) {
        selectClient(firstClient);
      } else if (clientSearch.trim() && clientsQuery.isSuccess) {
        openClientModal();
      }
    }
    if (event.key === 'Escape') {
      setClientPickerOpen(false);
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
    setFeedback(null);
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
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    }
  }

  async function printTicket() {
    if (!ticket) return;
    try {
      await api.recordTicketPrint(ticket.achatId);
    } catch (error) {
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    }
    window.print();
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
            <Button className="primary" onClick={printTicket}>
              Imprimer le ticket
            </Button>
            <Button onClick={downloadTicket}>Télécharger le PDF</Button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setTicket(null);
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
              onChange={(event) => {
                setSearch(event.target.value);
                setProductPage(0);
              }}
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
              <EmptyState compact>Aucun produit trouvé dans le rayon.</EmptyState>
            )}
            {productsQuery.data && (
              <div className="checkout-product-pagination">
                <div className="checkout-page-size">
                  <SelectField
                    label="Produits par page"
                    name="checkout-page-size"
                    onChange={(event) => {
                      setProductPageSize(Number(event.target.value));
                      setProductPage(0);
                    }}
                    value={productPageSize}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </SelectField>
                </div>
                <Pager
                  page={productPage}
                  pages={productsQuery.data.page.totalPages}
                  setPage={setProductPage}
                />
              </div>
            )}
          </section>

          <section className="basket">
            <p className="eyebrow">
              LE PANIER · {watchedLines.reduce((sum, line) => sum + (line.quantite || 0), 0)}{' '}
              ARTICLES
            </p>
            <h2>À régler</h2>
            <div className="customer-picker">
              <div className="customer-picker-control">
                <Field
                  aria-autocomplete="list"
                  aria-controls={clientPickerOpen ? 'client-options' : undefined}
                  aria-expanded={clientPickerOpen && !selectedClient}
                  aria-haspopup="listbox"
                  label="Client (facultatif)"
                  name="client-search"
                  value={clientSearch}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setSelectedClient(null);
                    form.setValue('clientId', null);
                    setClientPickerOpen(true);
                  }}
                  onFocus={() => setClientPickerOpen(true)}
                  onKeyDown={handleClientKeyDown}
                  placeholder="Chercher un client par nom"
                  autoComplete="off"
                />
                {!selectedClient && (
                  <button
                    className="text-button customer-add-button"
                    onClick={openClientModal}
                    type="button"
                  >
                    + Nouveau client
                  </button>
                )}
              </div>
              {clientPickerOpen && !selectedClient && (
                <>
                  {clientsQuery.isLoading ? (
                    <p className="supplier-search-status" role="status">
                      Recherche des clients…
                    </p>
                  ) : clientsQuery.isError ? (
                    <div className="supplier-search-error">
                      <ErrorState error={clientsQuery.error} />
                      <Button onClick={() => clientsQuery.refetch()} type="button">
                        Réessayer
                      </Button>
                    </div>
                  ) : clientsQuery.data?.content.length ? (
                    <div
                      className="supplier-options"
                      id="client-options"
                      role="listbox"
                      aria-label="Clients correspondants"
                    >
                      {clientsQuery.data.content.slice(0, 8).map((client) => (
                        <button
                          aria-selected="false"
                          className="suggestion"
                          key={client.id}
                          onClick={() => selectClient(client)}
                          role="option"
                          type="button"
                        >
                          <span>{[client.prenom, client.nom].filter(Boolean).join(' ')}</span>
                          <small>{client.telephone || 'Téléphone non renseigné'}</small>
                        </button>
                      ))}
                    </div>
                  ) : clientSearch.trim() && clientsQuery.isSuccess ? (
                    <div className="supplier-no-results" role="status">
                      <span>Aucun client ne correspond à cette recherche.</span>
                    </div>
                  ) : (
                    <p className="supplier-search-status" role="status">
                      Aucun client enregistré.
                    </p>
                  )}
                </>
              )}
              {selectedClient && (
                <p className="supplier-selected" role="status">
                  Client sélectionné : {selectedClient.prenom} {selectedClient.nom}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearch('');
                      form.setValue('clientId', null);
                      setClientPickerOpen(true);
                    }}
                  >
                    Changer
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientSearch('');
                      form.setValue('clientId', null);
                    }}
                  >
                    Vente sans client
                  </button>
                </p>
              )}
              {form.formState.errors.clientId?.message && (
                <p className="field-error" role="alert">
                  {form.formState.errors.clientId.message}
                </p>
              )}
            </div>
            {lines.fields.length === 0 ? (
              <EmptyState compact>Ajoutez un produit depuis le rayon.</EmptyState>
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
                      <NumberField
                        control={form.control}
                        label="Qté"
                        min={1}
                        max={product?.stockActuel}
                        step={1}
                        name={`lignes.${index}.quantite`}
                        error={form.formState.errors.lignes?.[index]?.quantite?.message}
                      />
                      <b className="mono">
                        {money((product?.prixVente || 0) * (watchedLines[index]?.quantite || 0))}
                      </b>
                      <IconButton
                        icon="remove"
                        label={`Retirer ${product?.nom || 'ce produit'} du panier`}
                        onClick={() => lines.remove(index)}
                      />
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
        <Modal
          title="Nouveau client pour cette vente"
          description="Créez sa fiche pour l’associer immédiatement à l’achat."
          onClose={() => setClientModal(false)}
        >
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
            <Controller
              control={clientCreate.control}
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
            <Button className="primary" type="submit" disabled={createClient.isPending}>
              Créer le client
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
