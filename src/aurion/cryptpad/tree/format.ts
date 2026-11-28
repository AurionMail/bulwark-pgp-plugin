// lib/format.ts
// Sizes and dates for the user's language.

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatSize(bytes: number | null | undefined, locale?: string): string {
  let n = Number(bytes) || 0;
  let unit = 0;
  while (n >= 1024 && unit < UNITS.length - 1) {
    n /= 1024;
    unit++;
  }
  const digits = unit === 0 || n >= 100 ? 0 : 1;
  let text: string;
  try {
    text = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: digits }).format(n);
  } catch {
    text = n.toFixed(digits);
  }
  return `${text} ${UNITS[unit]}`;
}