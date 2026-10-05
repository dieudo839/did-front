import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
  sexe: 'F',
  dateNaissance: '',
  identifiant: '',
  motDePasse: '',
  role: 'VENDEUR',
  actif: true,
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<User | null | false>(false);
  const [userToChangeStatus, setUserToChangeStatus] = useState<User | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const users = useQuery({ queryKey: ['users', page], queryFn: () => api.users(page) });
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
    setEditing(user);
    form.reset(
      user
        ? {
            nom: user.nom,
            prenom: user.prenom,
            matricule: user.matricule,
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
      {users.isLoading ? (
        <LoadingState label="On ouvre le registre de l’équipe…" />
      ) : users.error ? (
        <ErrorState error={users.error} />
      ) : users.data?.content.length ? (
        <DataTable headers={['NOM', 'MATRICULE', 'NOM D’UTILISATEUR', 'RÔLE', 'ÉTAT', 'GESTE']}>
          {users.data.content.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>
                  {user.prenom} {user.nom}
                </strong>
                <small className="table-subline">Né·e le {user.dateNaissance}</small>
              </td>
              <td className="mono">{user.matricule}</td>
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
                <IconButton
                  className={user.actif ? 'danger-icon' : ''}
                  icon={user.actif ? 'deactivate' : 'activate'}
                  label={`${user.actif ? 'Désactiver' : 'Réactiver'} ${user.prenom} ${user.nom}`}
                  disabled={status.isPending}
                  onClick={() => setUserToChangeStatus(user)}
                />
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState>Aucun compte dans le registre.</EmptyState>
      )}
      <Pager page={page} pages={users.data?.totalPages || 0} setPage={setPage} />
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
            <Field
              label={editing ? 'Nouveau mot de passe (requis par l’API)' : 'Mot de passe'}
              type="password"
              autoComplete="new-password"
              {...form.register('motDePasse')}
              error={form.formState.errors.motDePasse?.message}
            />
            <SelectField
              label="Rôle"
              {...form.register('role')}
              error={form.formState.errors.role?.message}
            >
              <option value="VENDEUR">Vendeur</option>
              <option value="ADMIN">Gérant (ADMIN)</option>
            </SelectField>
            <label className="check-field">
              <input type="checkbox" {...form.register('actif')} />
              <span>Compte actif</span>
            </label>
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
