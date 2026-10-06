import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  FormattedNumberField,
  LoadingState,
  SelectField,
} from '../components/ui';
import { Heading, Pager } from '../components/layout';

type ContactTab = 'clients' | 'grossistes';

export function ClientsPage() {
  const [tab, setTab] = useState<ContactTab>('clients');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneTerm, setPhoneTerm] = useState('');
  const [minimumPurchases, setMinimumPurchases] = useState('');
  const [minimumPurchasesFilter, setMinimumPurchasesFilter] = useState('');
  const [frequents, setFrequents] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPhoneTerm(phoneSearch.trim());
      setMinimumPurchasesFilter(minimumPurchases);
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, phoneSearch, minimumPurchases]);

  const clients = useQuery({
    queryKey: ['contacts', 'clients', page, term, phoneTerm, frequents, minimumPurchasesFilter],
    queryFn: () =>
      api.clients(term, page, 10, {
        telephone: phoneTerm,
        frequents,
        achatsMinimum: minimumPurchasesFilter || undefined,
      }),
    enabled: tab === 'clients',
  });
  const wholesalers = useQuery({
    queryKey: ['contacts', 'grossistes', page, term],
    queryFn: () => api.wholesalers(term, page, 10),
    enabled: tab === 'grossistes',
  });

  function changeTab(nextTab: ContactTab) {
    setTab(nextTab);
    setPage(0);
  }

  return (
    <>
      <Heading kicker="Répertoire" title="Clients et grossistes" />
      <div className="register-tabs contacts-tabs" role="tablist" aria-label="Répertoire">
        <button
          aria-selected={tab === 'clients'}
          className={tab === 'clients' ? 'active' : ''}
          onClick={() => changeTab('clients')}
          role="tab"
          type="button"
        >
          Clients
        </button>
        <button
          aria-selected={tab === 'grossistes'}
          className={tab === 'grossistes' ? 'active' : ''}
          onClick={() => changeTab('grossistes')}
          role="tab"
          type="button"
        >
          Grossistes
        </button>
      </div>

      <div className={`contacts-toolbar ${tab === 'clients' ? 'contacts-toolbar-clients' : ''}`}>
        <Field
          autoComplete="off"
          label={tab === 'clients' ? 'Rechercher un client' : 'Rechercher un grossiste'}
          name="contacts-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={tab === 'clients' ? 'Nom, prénom ou téléphone' : 'Nom ou téléphone'}
          value={search}
        />
        {tab === 'clients' ? (
          <>
            <Field
              autoComplete="off"
              label="Téléphone"
              name="clients-phone"
              onChange={(event) => setPhoneSearch(event.target.value)}
              placeholder="Filtrer par téléphone"
              value={phoneSearch}
            />
            <FormattedNumberField
              label="Achats minimum"
              onValueChange={setMinimumPurchases}
              placeholder="Sans minimum"
              value={minimumPurchases}
            />
            <SelectField
              aria-describedby="clients-sort-help"
              label="Ordre des clients"
              name="clients-sort"
              onChange={(event) => {
                setFrequents(event.target.value === 'frequents');
                setPage(0);
              }}
              value={frequents ? 'frequents' : 'nom'}
            >
              <option value="nom">Nom A à Z</option>
              <option value="frequents">Les plus réguliers</option>
            </SelectField>
          </>
        ) : (
          <span className="muted small">
            {term ? `Résultats pour « ${term} »` : 'Liste des contacts enregistrés'}
          </span>
        )}
      </div>
      {tab === 'clients' && (
        <p className="contacts-sort-hint" id="clients-sort-help">
          Tri décroissant selon le nombre total d’achats enregistrés.
        </p>
      )}

      {tab === 'clients' ? (
        clients.isLoading ? (
          <LoadingState label="Chargement des clients…" />
        ) : clients.isError ? (
          <div className="contacts-error">
            <ErrorState error={clients.error} />
            <Button onClick={() => clients.refetch()}>Réessayer</Button>
          </div>
        ) : clients.data?.content.length ? (
          <>
            <DataTable className="clients-table" headers={['NOM', 'TÉLÉPHONE', 'ACHATS']}>
              {clients.data.content.map((client) => (
                <tr key={client.id}>
                  <td>
                    <strong>{[client.prenom, client.nom].filter(Boolean).join(' ')}</strong>
                  </td>
                  <td>{client.telephone || '—'}</td>
                  <td className="right amount">{client.nombreAchats}</td>
                </tr>
              ))}
            </DataTable>
            <Pager page={page} pages={clients.data.page.totalPages} setPage={setPage} />
          </>
        ) : (
          <EmptyState>
            {term ? 'Aucun client ne correspond à cette recherche.' : 'Aucun client enregistré.'}
          </EmptyState>
        )
      ) : wholesalers.isLoading ? (
        <LoadingState label="Chargement des grossistes…" />
      ) : wholesalers.isError ? (
        <div className="contacts-error">
          <ErrorState error={wholesalers.error} />
          <Button onClick={() => wholesalers.refetch()}>Réessayer</Button>
        </div>
      ) : wholesalers.data?.content.length ? (
        <>
          <DataTable headers={['GROSSISTE', 'TÉLÉPHONE', 'ADRESSE']}>
            {wholesalers.data.content.map((wholesaler) => (
              <tr key={wholesaler.id}>
                <td>
                  <strong>{wholesaler.nom}</strong>
                </td>
                <td>{wholesaler.telephone || '—'}</td>
                <td>{wholesaler.adresse || '—'}</td>
              </tr>
            ))}
          </DataTable>
          <Pager page={page} pages={wholesalers.data.page.totalPages} setPage={setPage} />
        </>
      ) : (
        <EmptyState>
          {term
            ? 'Aucun grossiste ne correspond à cette recherche.'
            : 'Aucun grossiste enregistré.'}
        </EmptyState>
      )}
    </>
  );
}
