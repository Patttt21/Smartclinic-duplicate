/** Philippine peso formatting — Smart Clinic */
export function formatPeso(amount: number, opts?: { compact?: boolean }): string {
  const n = Number.isFinite(amount) ? amount : 0;
  if (opts?.compact && Math.abs(n) >= 1_000_000) {
    return `₱${(n / 1_000_000).toFixed(1)}M`;
  }
  if (opts?.compact && Math.abs(n) >= 10_000) {
    return `₱${(n / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export const PESO_SYMBOL = '₱';
