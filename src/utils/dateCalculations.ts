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

export interface MeasureExpirationInfo {
  status: 'vencida' | 'por_vencer' | 'vigente' | 'duracion_causa' | 'sin_fecha';
  daysDiff: number | null; // e.g. -10 for expired 10 days ago, +3 for expiring in 3 days
  badgeLabel: string;
  badgeClass: string;
  isExpired: boolean;
  isExpiringSoon: boolean; // within 7 days
  formattedExpiryDate: string;
}

/**
 * Evaluates the expiration status of a judicial measure
 */
export function getMeasureExpirationInfo(fechaHasta?: string | null): MeasureExpirationInfo {
  if (!fechaHasta || !fechaHasta.trim()) {
    return {
      status: 'sin_fecha',
      daysDiff: null,
      badgeLabel: 'Sin fecha límite',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      isExpired: false,
      isExpiringSoon: false,
      formattedExpiryDate: 'No especificada',
    };
  }

  const upper = fechaHasta.toUpperCase().trim();
  if (
    upper.includes('DURACION') ||
    upper.includes('FINALIZAR') ||
    upper.includes('ACTUACIONES') ||
    upper.includes('ETI') ||
    upper.includes('CAUSA')
  ) {
    return {
      status: 'duracion_causa',
      daysDiff: null,
      badgeLabel: 'Duración de Causa',
      badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
      isExpired: false,
      isExpiringSoon: false,
      formattedExpiryDate: fechaHasta,
    };
  }

  const parsed = parseDateFlexible(fechaHasta);
  if (!parsed) {
    return {
      status: 'sin_fecha',
      daysDiff: null,
      badgeLabel: fechaHasta.length > 20 ? `${fechaHasta.substring(0, 18)}...` : fechaHasta,
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      isExpired: false,
      isExpiringSoon: false,
      formattedExpiryDate: fechaHasta,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedExpiry = formatToDDMMYYYY(target);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      status: 'vencida',
      daysDiff: diffDays,
      badgeLabel: absDays === 1 ? 'Venció ayer' : `Vencida (${absDays}d)`,
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold',
      isExpired: true,
      isExpiringSoon: false,
      formattedExpiryDate: formattedExpiry,
    };
  }

  if (diffDays <= 7) {
    let label = `Por vencer (${diffDays}d)`;
    if (diffDays === 0) label = '¡Vence HOY!';
    else if (diffDays === 1) label = '¡Vence MAÑANA!';

    return {
      status: 'por_vencer',
      daysDiff: diffDays,
      badgeLabel: label,
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-500 font-bold shadow-sm',
      isExpired: false,
      isExpiringSoon: true,
      formattedExpiryDate: formattedExpiry,
    };
  }

  return {
    status: 'vigente',
    daysDiff: diffDays,
    badgeLabel: `Vigente (${diffDays}d)`,
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium',
    isExpired: false,
    isExpiringSoon: false,
    formattedExpiryDate: formattedExpiry,
  };
}

