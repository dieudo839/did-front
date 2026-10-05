import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import {
  ActionFeedback,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FormattedNumberField,
  IconButton,
  LoadingState,
  SelectField,
} from '../components/ui';
import { Heading, Pager } from '../components/layout';
import type { Client, Grossiste } from '../types';
import { money, localDateTime } from '../utils';
import { apiErrorMessage } from '../forms';

type Register = 'ventes' | 'arrivages';

export function HistoryPage() {
  const [register, setRegister] = useState<Register>('ventes');
  const [page, setPage] = useState(0);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [minimumTotal, setMinimumTotal] = useState('');
  const [maximumTotal, setMaximumTotal] = useState('');
  const [clientId, setClientId] = useState('');
  const [grossisteId, setGrossisteId] = useState('');
  const [sort, setSort] = useState<'recent' | 'oldest' | 'highest' | 'lowest'>('recent');
  const [downloadError, setDownloadError] = useState('');
  const clients = useQuery({ queryKey: ['clients', 'all'], queryFn: () => api.clients('') });
  const wholesalers = useQuery({
    queryKey: ['wholesalers', 'all'],
    queryFn: () => api.wholesalers(''),
  });
  const filters =
    register === 'ventes'
      ? {
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
          clientId: clientId || undefined,
          totalMinimum: minimumTotal || undefined,
          totalMaximum: maximumTotal || undefined,
        }
      : {
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
          grossisteId: grossisteId || undefined,
          totalMinimum: minimumTotal || undefined,
          totalMaximum: maximumTotal || undefined,
        };
  const sortProperty = register === 'ventes' ? 'dateAchat' : 'dateLivraison';
  const sortParameter =
    sort === 'oldest'
      ? `${sortProperty},asc`
      : sort === 'highest'
        ? 'total,desc'
        : sort === 'lowest'
          ? 'total,asc'
          : `${sortProperty},desc`;
  const purchases = useQuery({
    queryKey: ['purchases', page, filters, sortParameter],
    queryFn: () => api.purchases(page, filters, sortParameter),
    enabled: register === 'ventes',
  });
  const deliveries = useQuery({
    queryKey: ['deliveries', page, filters, sortParameter],
    queryFn: () => api.deliveries(page, filters, sortParameter),
    enabled: register === 'arrivages',
  });

  function switchRegister(next: Register) {
    setRegister(next);
    setPage(0);
    setDownloadError('');
    setSort('recent');
  }

  async function downloadPdf(id: string) {
    try {
      const blob = await api.ticketPdf(id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'ticket-de-caisse.pdf';
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDownloadError(apiErrorMessage(error));
    }
  }

  return (
    <>
      <Heading kicker="CARNET · VENTES ET APPROVISIONNEMENTS" title="Les opérations" />
      <div className="register-tabs" role="tablist" aria-label="Type d’opération">
        <button
          type="button"
          role="tab"
          aria-selected={register === 'ventes'}
          className={register === 'ventes' ? 'active' : ''}
          onClick={() => switchRegister('ventes')}
        >
          Achats des clients
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={register === 'arrivages'}
          className={register === 'arrivages' ? 'active' : ''}
          onClick={() => switchRegister('arrivages')}
        >
          Livraisons reçues
        </button>
      </div>
      <div className="history-filters">
        <Field
          label="Depuis le"
          name="dateDebut"
          type="date"
          value={dateDebut}
          onChange={(event) => {
            setDateDebut(event.target.value);
            setPage(0);
          }}
        />
        <Field
          label="Jusqu’au"
          name="dateFin"
          type="date"
          value={dateFin}
          onChange={(event) => {
            setDateFin(event.target.value);
            setPage(0);
          }}
        />
        <FormattedNumberField
          label="Montant minimum"
          decimal
          onValueChange={(value) => {
            setMinimumTotal(value);
            setPage(0);
          }}
          placeholder="Sans minimum"
          value={minimumTotal}
        />
        <FormattedNumberField
          label="Montant maximum"
          decimal
          onValueChange={(value) => {
            setMaximumTotal(value);
            setPage(0);
          }}
          placeholder="Sans maximum"
          value={maximumTotal}
        />
        {register === 'ventes' ? (
          <SelectField
            label="Client"
            name="clientId"
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tous les clients</option>
            {clients.data?.content.map((client: Client) => (
              <option key={client.id} value={client.id}>
                {client.prenom} {client.nom}
              </option>
            ))}
          </SelectField>
        ) : (
          <SelectField
            label="Grossiste"
            name="grossisteId"
            value={grossisteId}
            onChange={(event) => {
              setGrossisteId(event.target.value);
              setPage(0);
            }}
          >
            <option value="">Tous les grossistes</option>
            {wholesalers.data?.content.map((wholesaler: Grossiste) => (
              <option key={wholesaler.id} value={wholesaler.id}>
                {wholesaler.nom}
              </option>
            ))}
          </SelectField>
        )}
        <SelectField
          label="Trier les résultats"
          name="operations-sort"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as typeof sort);
            setPage(0);
          }}
        >
          <option value="recent">Plus récents</option>
          <option value="oldest">Plus anciens</option>
          <option value="highest">Montant décroissant</option>
          <option value="lowest">Montant croissant</option>
        </SelectField>
      </div>
      {dateDebut && dateFin && dateDebut > dateFin && (
        <p className="field-error" role="alert">
          La date de début doit précéder la date de fin.
        </p>
      )}
      {downloadError && (
        <ActionFeedback tone="error" message={downloadError} onClose={() => setDownloadError('')} />
      )}

      {register === 'ventes' ? (
        purchases.isLoading ? (
          <LoadingState label="On ouvre le carnet des achats…" />
        ) : purchases.error ? (
          <ErrorState error={purchases.error} />
        ) : purchases.data?.content.length ? (
          <DataTable
            className="operations-table purchases-table"
            headers={['DATE', 'CLIENT', 'ARTICLES', 'TOTAL', 'TICKET']}
          >
            {purchases.data.content.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  <strong>{localDateTime(purchase.dateAchat)}</strong>
                </td>
                <td>{purchase.client || 'Client comptoir'}</td>
                <td>
                  <details className="line-details">
                    <summary>{purchase.lignes.length} lignes</summary>
                    {purchase.lignes.map((line, index) => (
                      <p key={`${line.produitId}-${index}`}>
                        {line.quantite} × {line.produit} <span>{money(line.sousTotal)}</span>
                      </p>
                    ))}
                  </details>
                </td>
                <td className="right mono">{money(purchase.total)}</td>
                <td>
                  <IconButton
                    icon="download"
                    label={`Télécharger le ticket de ${purchase.client || 'ce client'}`}
                    onClick={() => downloadPdf(purchase.id)}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState>Aucune vente ne correspond à ces filtres.</EmptyState>
        )
      ) : deliveries.isLoading ? (
        <LoadingState label="On ouvre le carnet des arrivages…" />
      ) : deliveries.error ? (
        <ErrorState error={deliveries.error} />
      ) : deliveries.data?.content.length ? (
        <DataTable
          className="operations-table deliveries-table-history"
          headers={['DATE', 'GROSSISTE', 'ARTICLES', 'TOTAL']}
        >
          {deliveries.data.content.map((delivery) => (
            <tr key={delivery.id}>
              <td>
                <strong>{localDateTime(delivery.dateLivraison)}</strong>
              </td>
              <td>{delivery.grossiste}</td>
              <td>
                <details className="line-details">
                  <summary>{delivery.lignes.length} lignes</summary>
                  {delivery.lignes.map((line, index) => (
                    <p key={`${line.produitId}-${index}`}>
                      {line.quantite} × {line.produit} <span>{money(line.sousTotal)}</span>
                    </p>
                  ))}
                </details>
              </td>
              <td className="right mono">{money(delivery.total)}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>Aucun arrivage ne correspond à ces filtres.</EmptyState>
      )}
      {register === 'ventes' && (
        <Pager page={page} pages={purchases.data?.totalPages || 0} setPage={setPage} />
      )}
      {register === 'arrivages' && (
        <Pager page={page} pages={deliveries.data?.totalPages || 0} setPage={setPage} />
      )}
    </>
  );
}
