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

export function formatDate(ms: number | null | undefined, locale?: string): string {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

/** The date `days` from `now`, as YYYY-MM-DD in local time; '' for 0 or less. */
export function dateInDays(days: number | string | null | undefined, now: Date = new Date()): string {
  const n = Math.floor(Number(days) || 0);
  if (n <= 0) return '';
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The host of an origin, for messages. */
export function hostOf(origin: string | null | undefined): string {
  try {
    return new URL(String(origin ?? '')).host;
  } catch {
    return String(origin ?? '');
  }
}