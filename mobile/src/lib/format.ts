/** Formatting helpers. The business books in EUR on Amazon.es, so EUR is the default. */

export function money(value: number | null | undefined, currency = 'EUR'): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function percent(value: number | null | undefined, digits = 1): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${n.toFixed(digits)}%`;
}

/** Parses user input that may use a comma as the decimal separator. */
export function parseNumber(input: string | null | undefined): number {
  if (!input) return 0;
  const cleaned = String(input).replace(/[^0-9,.\-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function parseInteger(input: string | null | undefined): number {
  const n = Math.round(parseNumber(input));
  return Number.isFinite(n) ? n : 0;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** "2026-07-01" -> "1 Jul 2026". Falls back to the raw string if unparseable. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Whole days from today to `iso`. Negative when the date is in the past. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/** Accepts a loosely typed date and normalises it to YYYY-MM-DD, or null. */
export function normaliseDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;
  const eu = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (eu) {
    const [, d, m, y] = eu;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return trimmed;
}
