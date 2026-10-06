import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { readSession } from '../api/client';
import { Icon } from '../components/Icon';
import { PhoneField } from '../components/PhoneField';
import { Heading, Pager } from '../components/layout';
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
  SelectField,
  Tag,
} from '../components/ui';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import { userSchema, type UserValues } from '../schemas/forms';
import type { User } from '../types';

const blankUser: UserValues = {
  nom: '',
  prenom: '',
  matricule: '',
  telephone: '',
  sexe: 'F',
  dateNaissance: '',
  identifiant: '',
  motDePasse: '',
  role: 'VENDEUR',
  actif: true,
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUserId = readSession()?.utilisateur.id;
  const [page, setPage] = useState(0);
  const [recherche, setRecherche] = useState('');
  const [rechercheAppliquee, setRechercheAppliquee] = useState('');
  const [role, setRole] = useState('');
  const [actif, setActif] = useState('');
  const [editing, setEditing] = useState<User | null | false>(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [userToChangeStatus, setUserToChangeStatus] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setRechercheAppliquee(recherche.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [recherche]);

  const users = useQuery({
    queryKey: ['users', page, rechercheAppliquee, role, actif],
    queryFn: () =>
      api.users(page, {
        recherche: rechercheAppliquee || undefined,
        role: role || undefined,
        actif: actif || undefined,
      }),
  });
  const filtresActifs = Boolean(recherche || role || actif);
  const form = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: blankUser });
  const save = useMutation({
    mutationFn: (body: UserValues) =>
      editing ? api.updateUser(editing.id, body) : api.createUser(body),
    onSuccess: (user) => {
      setUserToChangeStatus(null);
      setFeedback({ tone: 'success', message: `Compte ${user.identifiant} enregistré.` });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const status = useMutation({
    mutationFn: ({ id, actif }: { id: string; actif: boolean }) => api.setUserStatus(id, actif),
    onSuccess: (user) => {
      setUserToChangeStatus(null);
      setFeedback({
        tone: 'success',
        message: user.actif
          ? `Compte ${user.identifiant} réactivé.`
          : `Compte ${user.identifiant} désactivé.`,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      setUserToChangeStatus(null);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });

  function openUser(user: User | null) {
    setFeedback(null);
    setPasswordVisible(false);
    setEditing(user);
    form.reset(
      user
        ? {
            nom: user.nom,
            prenom: user.prenom,
            matricule: user.matricule,
            telephone: user.telephone || '',
            sexe: user.sexe,
            dateNaissance: user.dateNaissance,
            identifiant: user.identifiant,
            motDePasse: '',
            role: user.role,
            actif: user.actif,
          }
        : blankUser,
    );
  }

  return (
    <>
      <Heading
        kicker="GESTION DE L’ÉQUIPE · ADMIN"
        title="Le carnet du personnel"
        aside={
          <Button className="primary" onClick={() => openUser(null)}>
            Ajouter un compte +
          </Button>
        }
      />
      <div className="user-filters" role="search" aria-label="Filtres du personnel">
        <Field
          label="Rechercher un membre"
          name="recherche-personnel"
          placeholder="Nom, matricule, téléphone ou identifiant"
          value={recherche}
          onChange={(event) => {
            setRecherche(event.target.value);
            setPage(0);
          }}
        />
        <SelectField
          label="Rôle"
          name="role-personnel"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(0);
          }}
        >
          <option value="">Tous les rôles</option>
          <option value="ADMIN">Gérant</option>
          <option value="VENDEUR">Vendeur</option>
        </SelectField>
        <SelectField
          label="Statut du compte"
          name="statut-personnel"
          value={actif}
          onChange={(event) => {
            setActif(event.target.value);
            setPage(0);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actif</option>
          <option value="false">Désactivé</option>
        </SelectField>
        {(recherche || role || actif) && (
          <Button
            className="small"
            onClick={() => {
              setRecherche('');
              setRechercheAppliquee('');
              setRole('');
              setActif('');
              setPage(0);
            }}
          >
            Effacer les filtres
          </Button>
        )}
      </div>
      {users.isLoading ? (
        <LoadingState label="On ouvre le registre de l’équipe…" />
      ) : users.error ? (
        <ErrorState error={users.error} />
      ) : users.data?.content.length ? (
        <DataTable
          headers={['NOM', 'MATRICULE', 'TÉLÉPHONE', 'NOM D’UTILISATEUR', 'RÔLE', 'ÉTAT', 'GESTE']}
        >
          {users.data.content.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>
                  {user.prenom} {user.nom}
                </strong>
                <small className="table-subline">Né·e le {user.dateNaissance}</small>
              </td>
              <td className="mono">{user.matricule}</td>
              <td>{user.telephone || '—'}</td>
              <td>{user.identifiant}</td>
              <td>
                <Tag>{user.role === 'ADMIN' ? 'GÉRANT' : 'VENDEUR'}</Tag>
              </td>
              <td>
                <Tag danger={!user.actif}>{user.actif ? 'ACTIF' : 'DÉSACTIVÉ'}</Tag>
              </td>
              <td className="row-actions">
                <IconButton
                  icon="edit"
                  label={`Modifier ${user.prenom} ${user.nom}`}
                  onClick={() => openUser(user)}
                />
                {user.id === currentUserId ? (
                  <span className="small muted"></span>
                ) : (
                  <>
                    <IconButton
                      className={user.actif ? 'danger-icon' : ''}
                      icon={user.actif ? 'deactivate' : 'activate'}
                      label={`${user.actif ? 'Désactiver' : 'Réactiver'} ${user.prenom} ${user.nom}`}
                      disabled={status.isPending}
                      onClick={() => setUserToChangeStatus(user)}
                    />
                  </>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          title={filtresActifs ? 'Aucun membre ne correspond aux filtres' : 'Le carnet est vide'}
          description={
            filtresActifs
              ? 'Modifiez vos critères ou effacez les filtres pour afficher toute l’équipe.'
              : 'Les comptes du personnel apparaîtront ici après leur création.'
          }
          action={
            filtresActifs && (
              <Button
                className="small"
                onClick={() => {
                  setRecherche('');
                  setRechercheAppliquee('');
                  setRole('');
                  setActif('');
                  setPage(0);
                }}
              >
                Effacer les filtres
              </Button>
            )
          }
        />
      )}
      <Pager page={page} pages={users.data?.page.totalPages || 0} setPage={setPage} />
      {userToChangeStatus && (
        <ConfirmationModal
          title={userToChangeStatus.actif ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
          description={
            userToChangeStatus.actif ? (
              <>
                Le compte de{' '}
                <strong>
                  {userToChangeStatus.prenom} {userToChangeStatus.nom}
                </strong>{' '}
                ne pourra plus se connecter tant qu’il est désactivé.
              </>
            ) : (
              <>
                Le compte de{' '}
                <strong>
                  {userToChangeStatus.prenom} {userToChangeStatus.nom}
                </strong>{' '}
                pourra de nouveau se connecter.
              </>
            )
          }
          confirmLabel={userToChangeStatus.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
          onCancel={() => setUserToChangeStatus(null)}
          onConfirm={() =>
            status.mutate({ id: userToChangeStatus.id, actif: !userToChangeStatus.actif })
          }
          pending={status.isPending}
          danger={userToChangeStatus.actif}
        />
      )}
      {editing !== false && (
        <Modal
          title={editing ? 'Modifier le compte' : 'Nouveau compte'}
          description="Les informations de connexion et le rôle déterminent l’accès à la boutique."
          onClose={() => setEditing(false)}
        >
          <form
            className="editor-form user-editor"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
            noValidate
          >
            <Field
              label="Nom"
              {...form.register('nom')}
              error={form.formState.errors.nom?.message}
            />
            <Field
              label="Prénom"
              {...form.register('prenom')}
              error={form.formState.errors.prenom?.message}
            />
            <Field
              label="Matricule"
              {...form.register('matricule')}
              error={form.formState.errors.matricule?.message}
            />
            <Controller
              control={form.control}
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
            <SelectField
              label="Sexe"
              {...form.register('sexe')}
              error={form.formState.errors.sexe?.message}
            >
              <option value="F">F</option>
              <option value="M">M</option>
            </SelectField>
            <Field
              label="Date de naissance"
              type="date"
              {...form.register('dateNaissance')}
              error={form.formState.errors.dateNaissance?.message}
            />
            <Field
              label="Nom d’utilisateur"
              {...form.register('identifiant')}
              error={form.formState.errors.identifiant?.message}
            />
            <div className="user-password-control">
              <Field
                label={editing ? 'Nouveau mot de passe (requis par l’API)' : 'Mot de passe'}
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                {...form.register('motDePasse')}
                error={form.formState.errors.motDePasse?.message}
              />
              <button
                className="password-visibility password-visibility-inline"
                type="button"
                aria-pressed={passwordVisible}
                aria-label={
                  passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                }
                title={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                <Icon name={passwordVisible ? 'eye-off' : 'eye'} />
              </button>
            </div>
            <SelectField
              label="Rôle"
              {...form.register('role')}
              error={form.formState.errors.role?.message}
            >
              <option value="VENDEUR">Vendeur</option>
              <option value="ADMIN">Gérant (ADMIN)</option>
            </SelectField>
            {editing?.id === currentUserId ? (
              <p className="field-help">Votre compte doit rester actif.</p>
            ) : (
              <label className="check-field">
                <input type="checkbox" {...form.register('actif')} />
                <span>Compte actif</span>
              </label>
            )}
            <Button className="primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Enregistrement…' : 'Enregistrer le compte'}
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
