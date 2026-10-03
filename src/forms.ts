import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api/client';

export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
) {
  if (!(error instanceof ApiError)) return;
  Object.entries(error.fields).forEach(([name, message]) => {
    const fieldName = name.replace(/\[(\d+)\]/g, '.$1');
    setError(fieldName as Path<T>, { type: 'server', message });
  });
}

export function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}
