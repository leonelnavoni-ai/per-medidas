/**
 * Date calculation and formatting helpers for judicial measures
 */

/**
 * Parses flexible date formats:
 * - DD/MM/YYYY or D/M/YYYY (Argentinian standard)
 * - YYYY-MM-DD (HTML date input)
 */
export function parseDateFlexible(str: string | undefined | null): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // Format: DD/MM/YYYY or D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/').map(Number);
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }

  // Standard ISO or general parse fallback
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Formats a Date object to DD/MM/YYYY
 */
export function formatToDDMMYYYY(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Formats a Date object to YYYY-MM-DD for native HTML <input type="date">
 */
export function formatToInputDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Adds a specific number of calendar days to a starting Date
 */
export function addDays(startDate: Date, days: number): Date {
  const result = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates number of full days between two dates
 */
export function calculateDaysDiff(startDate: Date, endDate: Date): number {
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const diffTime = e.getTime() - s.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Friendly Spanish date string e.g. "Sábado, 5 de diciembre de 2026"
 */
export function formatFriendlySpanishDate(date: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return formatToDDMMYYYY(date);
  }
}
