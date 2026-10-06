import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Icon, type IconName } from './Icon';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`button ${className}`.trim()} />;
}

export function IconButton({
  label,
  icon,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName }) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      title={label}
      type={props.type || 'button'}
    >
      <Icon name={icon} />
    </Button>
  );
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

interface NumberFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  decimal?: boolean;
  required?: boolean;
}

function formatNumberInput(value: string, decimal: boolean) {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  const cleaned = normalized.replace(decimal ? /[^\d.]/g : /\D/g, '');
  const parts = cleaned.split('.');
  const integer = parts[0] || '';
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  const fraction = parts.length > 1 ? `,${parts.slice(1).join('')}` : '';
  return `${grouped}${fraction}`;
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  min = 0,
  max,
  step = 1,
  decimal = false,
  required = false,
}: NumberFieldProps<T>) {
  const { field } = useController({ control, name });
  const [display, setDisplay] = useState(() =>
    field.value === undefined || field.value === null
      ? ''
      : formatNumberInput(String(field.value), decimal),
  );
  const fieldId = String(name).replaceAll('.', '-');
  const errorId = `${fieldId}-error`;

  useEffect(() => {
    if (document.activeElement !== document.getElementById(fieldId)) {
      setDisplay(
        field.value === undefined || field.value === null
          ? ''
          : formatNumberInput(String(field.value), decimal),
      );
    }
  }, [decimal, field.value, fieldId]);

  function updateValue(value: string) {
    const formatted = formatNumberInput(value, decimal);
    setDisplay(formatted);
    const parsed = Number(formatted.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
    field.onChange(formatted && Number.isFinite(parsed) ? parsed : undefined);
    requestAnimationFrame(() => {
      const input = document.getElementById(fieldId) as HTMLInputElement | null;
      input?.setSelectionRange(formatted.length, formatted.length);
    });
  }

  return (
    <div className="field-wrap">
      <label className="field" htmlFor={fieldId}>
        <span>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </span>
        <input
          id={fieldId}
          name={field.name}
          ref={field.ref}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={display}
          min={min}
          max={max}
          step={step}
          required={required}
          onBlur={field.onBlur}
          onChange={(event) => updateValue(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {error && (
        <span className="field-error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function FormattedNumberField({
  label,
  value,
  onValueChange,
  decimal = false,
  placeholder,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  const fieldId = useId();
  const display = value ? formatNumberInput(value, decimal) : '';

  return (
    <div className="field-wrap">
      <label className="field" htmlFor={fieldId}>
        <span>{label}</span>
        <input
          id={fieldId}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onChange={(event) => {
            const formatted = formatNumberInput(event.target.value, decimal);
            onValueChange(formatted.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
          }}
        />
      </label>
    </div>
  );
}

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
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  children,
  title,
  description,
  action,
  compact = false,
}: {
  children?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`empty-state${compact ? ' empty-state-compact' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="empty-state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 5.5h16v13H4z" />
          <path d="M4 13h4l1.5 2h5l1.5-2h4" />
        </svg>
      </span>
      <div className="empty-state-content">
        {title && <h2>{title}</h2>}
        {children && <p>{children}</p>}
        {description && <p className="empty-state-description">{description}</p>}
        {action}
      </div>
    </section>
  );
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
  className = '',
}: {
  headers: string[];
  children: ReactNode;
  empty?: string;
  className?: string;
}) {
  let columnIndex = 0;
  const labelledRows = Children.map(children, (row) => {
    if (!isValidElement<{ children?: ReactNode }>(row) || row.type !== 'tr') {
      return row;
    }

    columnIndex = 0;
    const cells = Children.map(row.props.children, (cell) => {
      if (!isValidElement(cell) || cell.type !== 'td') {
        return cell;
      }

      const label = headers[columnIndex];
      columnIndex += 1;
      return cloneElement(cell, { 'data-label': label });
    });

    return cloneElement(row, undefined, cells);
  });

  return (
    <div className="table-wrap">
      <table className={className}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{labelledRows}</tbody>
      </table>
      {empty && <EmptyState>{empty}</EmptyState>}
    </div>
  );
}

export function Modal({
  title,
  description,
  className = '',
  onClose,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div className="modal-title-group">
            <h2 id={titleId}>{title}</h2>
            {description && <p className="modal-description">{description}</p>}
          </div>
          <IconButton className="modal-close" icon="close" label="Fermer" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  pending = false,
  danger = false,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal className="confirmation-modal" title={title} onClose={onCancel}>
      <div className="confirmation-content">
        <div className="confirmation-message">
          <span className={danger ? 'confirmation-symbol danger' : 'confirmation-symbol'}>
            <Icon name={danger ? 'warning' : 'activate'} />
          </span>
          <p>{description}</p>
        </div>
        <div className="confirmation-actions">
          <Button type="button" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button
            className={danger ? 'danger' : 'primary'}
            type="button"
            onClick={onConfirm}
            disabled={pending}
          >
            {danger && <Icon name="trash" />}
            {pending ? 'En cours…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ActionFeedback({
  tone,
  message,
  onClose,
}: {
  tone: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (tone !== 'success') {
      return;
    }

    const timer = window.setTimeout(() => closeRef.current(), 6000);
    return () => window.clearTimeout(timer);
  }, [message, tone]);

  return (
    <Modal
      className={`action-feedback-modal feedback-${tone}`}
      title={tone === 'success' ? 'Action réussie' : 'Action impossible'}
      onClose={onClose}
    >
      <div className="action-feedback-content" role={tone === 'error' ? 'alert' : 'status'}>
        <span className="action-feedback-symbol" aria-hidden="true">
          <Icon name={tone === 'success' ? 'success' : 'warning'} />
        </span>
        <p>{message}</p>
      </div>
      {tone === 'success' && (
        <p className="action-feedback-note">Cette fenêtre se fermera automatiquement.</p>
      )}
      <div className="confirmation-actions">
        <Button className={tone === 'success' ? 'primary' : ''} type="button" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  );
}
