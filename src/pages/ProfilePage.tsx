import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { ActionFeedback, Button, Field, SelectField } from '../components/ui';
import { PhoneField } from '../components/PhoneField';
import { Heading } from '../components/layout';
import { Icon } from '../components/Icon';
import { apiErrorMessage, applyApiFieldErrors } from '../forms';
import {
  passwordSchema,
  profileSchema,
  type PasswordValues,
  type ProfileValues,
} from '../schemas/forms';
import type { User } from '../types';

export function ProfilePage({
  user,
  onUserUpdated,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
}) {
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nom: user.nom,
      prenom: user.prenom,
      matricule: user.matricule,
      telephone: user.telephone || '',
      sexe: user.sexe,
      dateNaissance: user.dateNaissance,
    },
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' },
  });
  const updateProfile = useMutation({
    mutationFn: (values: ProfileValues) => api.updateProfile(values),
    onSuccess: (updatedUser) => {
      onUserUpdated(updatedUser);
      setFeedback({ tone: 'success', message: 'Vos informations ont été mises à jour.' });
    },
    onError: (error) => {
      applyApiFieldErrors(error, profileForm.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const updatePassword = useMutation({
    mutationFn: (values: PasswordValues) =>
      api.changePassword(values.ancienMotDePasse, values.nouveauMotDePasse),
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Mot de passe modifié.' });
      passwordForm.reset();
    },
    onError: (error) => {
      applyApiFieldErrors(error, passwordForm.setError);
      setFeedback({ tone: 'error', message: apiErrorMessage(error) });
    },
  });
  const initials = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toLocaleUpperCase('fr-FR');

  return (
    <>
      <Heading kicker="COMPTE ET PRÉFÉRENCES" title="Mon profil" />
      <div className="profile-layout">
        <section className="profile-summary" aria-labelledby="profile-summary-title">
          <span className="profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2 id="profile-summary-title">
              {user.prenom} {user.nom}
            </h2>
            <p>{user.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'}</p>
          </div>
          <dl className="profile-identity-details">
            <div>
              <dt>Nom d’utilisateur</dt>
              <dd>{user.identifiant}</dd>
            </div>
            <div>
              <dt>Matricule</dt>
              <dd>{user.matricule}</dd>
            </div>
            <div>
              <dt>Téléphone</dt>
              <dd>{user.telephone || 'Non renseigné'}</dd>
            </div>
          </dl>
        </section>

        <div className="profile-sections">
          <section className="profile-section" aria-labelledby="profile-info-title">
            <header>
              <h2 id="profile-info-title">Informations personnelles</h2>
              <p>Modifiez les renseignements associés à votre compte.</p>
            </header>
            <form
              className="profile-form profile-information-form"
              onSubmit={profileForm.handleSubmit((values) => {
                setFeedback(null);
                updateProfile.mutate(values);
              })}
              noValidate
            >
              <Field
                label="Prénom"
                required
                {...profileForm.register('prenom')}
                error={profileForm.formState.errors.prenom?.message}
              />
              <Field
                label="Nom"
                required
                {...profileForm.register('nom')}
                error={profileForm.formState.errors.nom?.message}
              />
              <Field
                label="Matricule"
                required
                {...profileForm.register('matricule')}
                error={profileForm.formState.errors.matricule?.message}
              />
              <Controller
                control={profileForm.control}
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
                required
                {...profileForm.register('sexe')}
                error={profileForm.formState.errors.sexe?.message}
              >
                <option value="F">F</option>
                <option value="M">M</option>
              </SelectField>
              <Field
                label="Date de naissance"
                required
                type="date"
                {...profileForm.register('dateNaissance')}
                error={profileForm.formState.errors.dateNaissance?.message}
              />
              <Button className="primary small" type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer les informations'}
              </Button>
            </form>
          </section>

          <section className="profile-section" aria-labelledby="profile-password-title">
            <header>
              <div>
                <h2 id="profile-password-title">Changer le mot de passe</h2>
                <p>Choisissez un mot de passe d’au moins huit caractères.</p>
              </div>
              <button
                className="password-visibility"
                type="button"
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                <Icon name={passwordVisible ? 'eye-off' : 'eye'} />
                <span>{passwordVisible ? 'Masquer' : 'Afficher'}</span>
              </button>
            </header>
            <form
              className="profile-form profile-password-form"
              onSubmit={passwordForm.handleSubmit((values) => {
                setFeedback(null);
                updatePassword.mutate(values);
              })}
              noValidate
            >
              <Field
                label="Ancien mot de passe"
                required
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                {...passwordForm.register('ancienMotDePasse')}
                error={passwordForm.formState.errors.ancienMotDePasse?.message}
              />
              <Field
                label="Nouveau mot de passe"
                required
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                {...passwordForm.register('nouveauMotDePasse')}
                error={passwordForm.formState.errors.nouveauMotDePasse?.message}
              />
              <Field
                label="Confirmer le nouveau mot de passe"
                required
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="new-password"
                {...passwordForm.register('confirmation')}
                error={passwordForm.formState.errors.confirmation?.message}
              />
              <Button className="primary" type="submit" disabled={updatePassword.isPending}>
                {updatePassword.isPending ? 'Enregistrement…' : 'Modifier le mot de passe'}
              </Button>
            </form>
          </section>
        </div>
      </div>
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
