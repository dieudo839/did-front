import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Heading, Pager } from '../components/layout';
import {
  ActionFeedback,
  Button,
  ConfirmationModal,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  SelectField,
  Tag,
} from '../components/ui';
import { localDateTime } from '../utils';
import type { AuditPurgeConfiguration } from '../types';

const actions = [
  ['CREATION', 'Création'],
  ['MODIFICATION', 'Modification'],
  ['SUPPRESSION', 'Suppression'],
  ['IMPRESSION', 'Impression ticket'],
  ['TELECHARGEMENT_PDF', 'Téléchargement PDF'],
  ['CONSULTATION', 'Consultation'],
  ['CONSULTATION_TICKET', 'Consultation ticket'],
  ['CONNEXION', 'Connexion'],
  ['DECONNEXION', 'Déconnexion'],
];

function afficherDetails(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function AuditJournalPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [recherche, setRecherche] = useState('');
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [action, setAction] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [conservationJours, setConservationJours] = useState('365');
  const [purgeActive, setPurgeActive] = useState(false);
  const [dateAvantPurge, setDateAvantPurge] = useState('');
  const [confirmationPurge, setConfirmationPurge] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const purgeConfiguration = useQuery({
    queryKey: ['audit-purge-configuration'],
    queryFn: api.auditPurgeConfiguration,
  });

  useEffect(() => {
    if (purgeConfiguration.data) {
      setConservationJours(String(purgeConfiguration.data.conservationJours));
      setPurgeActive(purgeConfiguration.data.actif);
    }
  }, [purgeConfiguration.data]);

  const savePurgeConfiguration = useMutation({
    mutationFn: (configuration: AuditPurgeConfiguration) =>
      api.updateAuditPurgeConfiguration(configuration),
    onSuccess: (configuration) => {
      queryClient.setQueryData(['audit-purge-configuration'], configuration);
      setFeedback({ tone: 'success', message: 'Paramètres de conservation enregistrés.' });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Échec de l’enregistrement.',
      });
    },
  });

  const purge = useMutation({
    mutationFn: api.purgeAudit,
    onSuccess: (result) => {
      setConfirmationPurge(false);
      setDateAvantPurge('');
      setPage(0);
      setFeedback({
        tone: 'success',
        message: `${result.nombreSupprime} entrée${result.nombreSupprime === 1 ? '' : 's'} supprimée${result.nombreSupprime === 1 ? '' : 's'} du journal.`,
      });
      queryClient.invalidateQueries({ queryKey: ['audit-journal'] });
    },
    onError: (error) => {
      setConfirmationPurge(false);
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Échec de la purge.',
      });
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRechercheAppliquee(recherche.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [recherche]);

  const journal = useQuery({
    queryKey: ['audit-journal', page, rechercheAppliquee, action, dateDebut, dateFin],
    queryFn: () =>
      api.auditJournal(page, {
        recherche: rechercheAppliquee || undefined,
        action: action || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      }),
  });
  const filtresActifs = Boolean(rechercheAppliquee || action || dateDebut || dateFin);
  const retentionValide =
    /^\d+$/.test(conservationJours) &&
    Number(conservationJours) >= 1 &&
    Number(conservationJours) <= 3650;
  const aujourdHui = new Date();
  const dateMaximum = [
    aujourdHui.getFullYear(),
    String(aujourdHui.getMonth() + 1).padStart(2, '0'),
    String(aujourdHui.getDate()).padStart(2, '0'),
  ].join('-');

  function reinitialiserFiltres() {
    setRecherche('');
    setRechercheAppliquee('');
    setAction('');
    setDateDebut('');
    setDateFin('');
    setPage(0);
  }

  return (
    <>
      <Heading kicker="SUIVI · TRAÇABILITÉ" title="Journal d’audit" />
      <p className="audit-description">
        Créations, modifications, suppressions, consultations et impressions effectuées dans le
        système.
      </p>
      <section className="audit-retention" aria-labelledby="audit-retention-title">
        <header className="audit-retention-heading">
          <div>
            <h2 id="audit-retention-title">Conservation des journaux</h2>
            <p>Choisissez la durée de conservation et lancez une purge manuelle si nécessaire.</p>
          </div>
        </header>
        {purgeConfiguration.isLoading ? (
          <LoadingState label="Chargement des paramètres de conservation…" />
        ) : purgeConfiguration.error ? (
          <ErrorState error={purgeConfiguration.error} />
        ) : (
          <div className="audit-retention-grid">
            <form
              className="audit-retention-policy"
              onSubmit={(event) => {
                event.preventDefault();
                if (retentionValide) {
                  savePurgeConfiguration.mutate({
                    actif: purgeActive,
                    conservationJours: Number(conservationJours),
                  });
                }
              }}
            >
              <div>
                <h3>Purge automatique</h3>
                <p>Les entrées dépassant cette durée seront supprimées chaque nuit.</p>
              </div>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={purgeActive}
                  onChange={(event) => setPurgeActive(event.target.checked)}
                />
                <span>Activer la purge automatique</span>
              </label>
              <Field
                label="Conserver les journaux pendant (jours)"
                name="conservation-journaux"
                type="number"
                min="1"
                max="3650"
                step="1"
                value={conservationJours}
                onChange={(event) => setConservationJours(event.target.value)}
                error={retentionValide ? undefined : 'Saisissez une durée entre 1 et 3 650 jours.'}
              />
              <Button
                className="primary"
                type="submit"
                disabled={!retentionValide || savePurgeConfiguration.isPending}
              >
                {savePurgeConfiguration.isPending
                  ? 'Enregistrement…'
                  : 'Enregistrer les paramètres'}
              </Button>
            </form>
            <div className="audit-manual-purge">
              <div>
                <h3>Purge manuelle</h3>
                <p>Supprimer les entrées jusqu’à la date choisie, incluse.</p>
              </div>
              <Field
                label="Supprimer jusqu’au"
                name="date-purge-journaux"
                type="date"
                max={dateMaximum}
                value={dateAvantPurge}
                onChange={(event) => setDateAvantPurge(event.target.value)}
              />
              <Button
                className="danger"
                type="button"
                disabled={!dateAvantPurge || purge.isPending}
                onClick={() => setConfirmationPurge(true)}
              >
                Purger les journaux
              </Button>
            </div>
          </div>
        )}
      </section>
      <div className="audit-filters">
        <Field
          label="Utilisateur ou ressource"
          name="recherche-audit"
          placeholder="Identifiant, route ou ressource"
          value={recherche}
          onChange={(event) => {
            setRecherche(event.target.value);
            setPage(0);
          }}
        />
        <SelectField
          label="Action"
          name="action-audit"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(0);
          }}
        >
          <option value="">Toutes les actions</option>
          {actions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          label="Depuis le"
          name="date-debut-audit"
          type="date"
          value={dateDebut}
          onChange={(event) => {
            setDateDebut(event.target.value);
            setPage(0);
          }}
        />
        <Field
          label="Jusqu’au"
          name="date-fin-audit"
          type="date"
          value={dateFin}
          onChange={(event) => {
            setDateFin(event.target.value);
            setPage(0);
          }}
        />
      </div>
      {dateDebut && dateFin && dateDebut > dateFin && (
        <p className="field-error" role="alert">
          La date de début doit précéder la date de fin.
        </p>
      )}
      {journal.isLoading ? (
        <LoadingState label="Chargement du journal d’audit…" />
      ) : journal.error ? (
        <ErrorState error={journal.error} />
      ) : journal.data?.content.length ? (
        <DataTable
          className="audit-table"
          headers={[
            'DATE',
            'UTILISATEUR',
            'ACTION',
            'RESSOURCE',
            'DÉTAILS',
            'RÉSULTAT',
            'ADRESSE IP',
          ]}
        >
          {journal.data.content.map((entry) => (
            <tr key={entry.id}>
              <td>{localDateTime(entry.dateAction)}</td>
              <td>
                <strong>{entry.acteur}</strong>
              </td>
              <td>{entry.action.replaceAll('_', ' ').toLocaleLowerCase('fr-FR')}</td>
              <td className="audit-resource">
                <span>{entry.methode}</span> {entry.ressource}
              </td>
              <td>
                {entry.details ? (
                  <details>
                    <summary>Afficher</summary>
                    <pre>{afficherDetails(entry.details)}</pre>
                  </details>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <Tag
                  danger={entry.statutHttp >= 400}
                  warning={entry.statutHttp >= 300 && entry.statutHttp < 400}
                >
                  {entry.statutHttp} {entry.statutHttp < 400 ? 'OK' : 'Échec'}
                </Tag>
              </td>
              <td className="mono">{entry.adresseIp || '—'}</td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          title={filtresActifs ? 'Aucune activité pour ces critères' : 'Le journal est encore vide'}
          description={
            filtresActifs
              ? 'Aucun événement ne correspond à votre recherche.'
              : 'Les actions réalisées dans l’application apparaîtront ici.'
          }
          action={
            filtresActifs && (
              <Button className="small" onClick={reinitialiserFiltres}>
                Réinitialiser les filtres
              </Button>
            )
          }
        />
      )}
      <Pager page={page} pages={journal.data?.page.totalPages || 0} setPage={setPage} />
      {confirmationPurge && (
        <ConfirmationModal
          title="Confirmer la purge du journal ?"
          description={
            <>
              Les journaux du <strong>{dateAvantPurge}</strong> et des jours précédents seront
              supprimés définitivement. Cette opération est irréversible.
            </>
          }
          confirmLabel="Supprimer ces journaux"
          onCancel={() => setConfirmationPurge(false)}
          onConfirm={() => purge.mutate(dateAvantPurge)}
          pending={purge.isPending}
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
