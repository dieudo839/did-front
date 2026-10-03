import type { ApiErrorBody, Session } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
export const SESSION_KEY = 'epicerie-session';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export function readSession(): Session | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as Session | null;
    if (
      session &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.utilisateur.id,
      )
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const session = readSession();
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);

  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    if (path === '/api/auth/login') {
      const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
      throw new ApiError(
        body.message || body.detail || 'Identifiant ou mot de passe incorrect.',
        response.status,
      );
    }
    localStorage.removeItem(SESSION_KEY);
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new ApiError('Votre session a expiré. Connectez-vous à nouveau.', 401);
  }

  if (response.status === 404 || response.status === 405) {
    throw new ApiError('Fonction indisponible : route backend manquante', response.status);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      body.message || `La requête a échoué (${response.status}).`,
      response.status,
      body.errors || {},
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function requestBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const session = readSession();
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (response.status === 401) {
    localStorage.removeItem(SESSION_KEY);
    if (window.location.pathname !== '/login') window.location.assign('/login');
    throw new ApiError('Votre session a expiré. Connectez-vous à nouveau.', 401);
  }
  if (response.status === 404 || response.status === 405) {
    throw new ApiError('Fonction indisponible : route backend manquante', response.status);
  }
  if (!response.ok) {
    throw new ApiError(`Le téléchargement a échoué (${response.status}).`, response.status);
  }
  return response.blob();
}
