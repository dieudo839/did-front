import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Button, ErrorState, Field } from '../components/ui';
import { Heading } from '../components/layout';
import { applyApiFieldErrors } from '../forms';
import { passwordSchema, type PasswordValues } from '../schemas/forms';

export function ProfilePage() {
  const [success, setSuccess] = useState('');
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: PasswordValues) =>
      api.changePassword(values.ancienMotDePasse, values.nouveauMotDePasse),
    onSuccess: () => {
      setSuccess('Mot de passe modifié.');
      form.reset();
    },
    onError: (error) => applyApiFieldErrors(error, form.setError),
  });

  return (
    <>
      <Heading kicker="VOTRE COMPTE" title="Changer le mot de passe" />
      <form
        className="profile-form"
        onSubmit={form.handleSubmit((values) => {
          setSuccess('');
          mutation.mutate(values);
        })}
        noValidate
      >
        <Field
          label="Ancien mot de passe"
          type="password"
          autoComplete="current-password"
          {...form.register('ancienMotDePasse')}
          error={form.formState.errors.ancienMotDePasse?.message}
        />
        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          {...form.register('nouveauMotDePasse')}
          error={form.formState.errors.nouveauMotDePasse?.message}
        />
        <Field
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmation')}
          error={form.formState.errors.confirmation?.message}
        />
        <p className="notice">
          Huit caractères minimum. Le nouveau mot de passe est chiffré par le serveur.
        </p>
        {mutation.isError && <ErrorState error={mutation.error} />}
        {success && (
          <p className="success" role="status">
            {success}
          </p>
        )}
        <Button className="primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Modifier le mot de passe'}
        </Button>
      </form>
    </>
  );
}
