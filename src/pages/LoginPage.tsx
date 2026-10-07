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
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="login-brand-row">
          <p className="login-brand">Gestion boutique</p>
          <span className="login-label">ESPACE DE GESTION</span>
        </div>
        <p className="login-overline">Accès sécurisé</p>
        <h1 id="login-title">Connexion</h1>
        <p className="login-intro">Saisissez les informations associées à votre compte.</p>
        <form onSubmit={submit} noValidate>
          <Field
            label="Nom d’utilisateur"
            required
            autoComplete="username"
            {...form.register('identifiant')}
            error={form.formState.errors.identifiant?.message}
          />
          <div className="login-password-field">
            <Field
              id="login-password"
              label="Mot de passe"
              required
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...form.register('motDePasse')}
              error={form.formState.errors.motDePasse?.message}
            />
            <button
              aria-controls="login-password"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              className="login-password-toggle"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {serverError && (
            <p className="error form-message" role="alert">
              {serverError}
            </p>
          )}
          <Button className="primary login-submit" type="submit" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>
        <p className="login-footnote">Accès réservé au personnel de la boutique.</p>
      </section>
    </main>
  );
}
