import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { api } from '../api';
import { Button, Field } from '../components/ui';
import { apiErrorMessage } from '../forms';
import { loginSchema, type LoginValues } from '../schemas/forms';
import type { Session } from '../types';

export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [serverError, setServerError] = useState('');
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifiant: '', motDePasse: '' },
  });
  const busy = form.formState.isSubmitting;

  const submit = form.handleSubmit(async (values) => {
    setServerError('');
    try {
      onLogin(await api.login(values.identifiant, values.motDePasse));
    } catch (error) {
      setServerError(apiErrorMessage(error));
    }
  });

  return (
    <main className="login">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="login-brand">Gestion boutique</p>
        <h1 id="login-title">Connexion</h1>
        <p className="login-intro">Identifiez-vous pour accéder à votre espace.</p>
        <form onSubmit={submit} noValidate>
          <Field
            label="Identifiant"
            autoComplete="username"
            {...form.register('identifiant')}
            error={form.formState.errors.identifiant?.message}
          />
          <Field
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            {...form.register('motDePasse')}
            error={form.formState.errors.motDePasse?.message}
          />
          {serverError && (
            <p className="error form-message" role="alert">
              {serverError}
            </p>
          )}
          <Button className="primary login-submit" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
        <p className="login-footnote">Accès réservé aux utilisateurs autorisés.</p>
      </section>
    </main>
  );
}
