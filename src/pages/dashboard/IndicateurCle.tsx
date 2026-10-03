import { money } from '../../utils';

export function IndicateurCle({
  label,
  value,
  variation,
  format = 'number',
  loading = false,
}: {
  label: string;
  value: number | null;
  variation: number | null;
  format?: 'money' | 'number';
  loading?: boolean;
}) {
  const formattedValue =
    value === null
      ? '—'
      : format === 'money'
        ? money(value)
        : new Intl.NumberFormat('fr-FR').format(value);
  const variationText =
    variation === null
      ? 'Variation indisponible'
      : variation > 0
        ? `Hausse de ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(variation)} %`
        : variation < 0
          ? `Baisse de ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Math.abs(variation))} %`
          : 'Stable';
  const variationClass =
    variation === null
      ? 'variation-neutral'
      : variation > 0
        ? 'variation-positive'
        : variation < 0
          ? 'variation-negative'
          : 'variation-neutral';

  return (
    <div className="dashboard-indicator" aria-busy={loading}>
      <span className="dashboard-indicator-label">{label}</span>
      {loading ? (
        <span className="indicator-skeleton" aria-hidden="true" />
      ) : (
        <strong className="dashboard-indicator-value">{formattedValue}</strong>
      )}
      <span className={`dashboard-variation ${variationClass}`}>
        {variation !== null && (
          <span aria-hidden="true">{variation > 0 ? '↑' : variation < 0 ? '↓' : '→'}</span>
        )}
        {variationText}
      </span>
    </div>
  );
}
