import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`button ${className}`.trim()} />;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  help?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, help, id, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id || props.name || generatedId;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const describedBy = [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className="field-wrap">
      <label className="field" htmlFor={fieldId}>
        <span>{label}</span>
        <input
          {...props}
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
        />
      </label>
      {help && (
        <span className="field-help" id={helpId}>
          {help}
        </span>
      )}
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  help?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, help, id, children, ...props },
  ref,
) {
  const generatedId = useId();
  const fieldId = id || props.name || generatedId;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;
  const describedBy = [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className="field-wrap">
      <label className="field" htmlFor={fieldId}>
        <span>{label}</span>
        <select
          {...props}
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
        >
          {children}
        </select>
      </label>
      {help && (
        <span className="field-help" id={helpId}>
          {help}
        </span>
      )}
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

export function Tag({
  children,
  danger = false,
  warning = false,
}: {
  children: ReactNode;
  danger?: boolean;
  warning?: boolean;
}) {
  const tone = danger ? 'tag-danger' : warning ? 'tag-warning' : '';
  return <span className={`tag ${tone}`.trim()}>{children}</span>;
}

export function CheckField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="check-field">
      <input {...props} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

export function ToggleField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="toggle-field">
      <input {...props} type="checkbox" role="switch" />
      <span>{label}</span>
    </label>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('fr-FR');

  return (
    <span className="styleguide-avatar" aria-label={name}>
      {initials}
    </span>
  );
}

export function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-label="Chargement" aria-busy="true" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <span
          className={`styleguide-skeleton ${index === lines - 1 ? 'short' : ''}`.trim()}
          key={index}
        />
      ))}
    </div>
  );
}

export function Toast({
  children,
  tone = 'success',
}: {
  children: ReactNode;
  tone?: 'success' | 'error';
}) {
  return (
    <p className={`toast toast-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function LoadingState({ label = 'Chargement en cours…' }: { label?: string }) {
  return (
    <p className="notice" role="status" aria-live="polite">
      {label}
    </p>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Une erreur est survenue.';

  return (
    <p className="error notice" role="alert">
      {message}
    </p>
  );
}

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && <EmptyState>{empty}</EmptyState>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), ' +
      'textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(selector);
    firstFocusable?.focus();

    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key !== 'Tab') {
        return;
      }

      const items = dialogRef.current?.querySelectorAll<HTMLElement>(selector);
      if (!items?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = items.item(0);
      const last = items.item(items.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => {
      window.removeEventListener('keydown', handleKeys);
      previousFocus.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="button text-button"
            type="button"
            onClick={onClose}
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
