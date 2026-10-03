export const money = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);

export function localDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR');
}
