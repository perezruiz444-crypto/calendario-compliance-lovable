import { format, differenceInDays, isPast, isValid, getISOWeek, addWeeks, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Category constants ───────────────────────────────────────────────
export const CATEGORIA_LABELS: Record<string, string> = {
  general: 'General',
  cert_iva_ieps: 'Cert. IVA/IEPS',
  immex: 'IMMEX',
  prosec: 'PROSEC',
  padron: 'Padrón',
  otro: 'Otro',
};

export const CATEGORIA_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cert_iva_ieps: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  immex: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  prosec: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  padron: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  oea: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  otro: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export const PROGRAMA_LABELS: Record<string, string> = {
  immex:         'IMMEX',
  prosec:        'PROSEC',
  padron:        'Padrón',
  cert_iva_ieps: 'Cert. IVA/IEPS',
  oea:           'OEA',
  general:       'General',
  otro:          'Otro',
};

// ─── Period key helpers ───────────────────────────────────────────────
export function getCurrentPeriodKey(presentacion: string | null): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const week = getISOWeek(now);

  switch (presentacion?.toLowerCase()) {
    case 'semanal': return `${year}-W${String(week).padStart(2, '0')}`;
    case 'quincenal': {
      const half = now.getDate() <= 15 ? '1' : '2';
      return `${year}-${month}-Q${half}`;
    }
    case 'mensual': return `${year}-${month}`;
    case 'bimestral': {
      const bim = Math.ceil((now.getMonth() + 1) / 2);
      return `${year}-B${bim}`;
    }
    case 'trimestral': {
      const q = Math.ceil((now.getMonth() + 1) / 3);
      return `${year}-T${q}`;
    }
    case 'semestral': {
      const s = now.getMonth() < 6 ? '1' : '2';
      return `${year}-S${s}`;
    }
    case 'anual': return `${year}`;
    default: return `${year}-${month}`;
  }
}

export function getPeriodLabel(presentacion: string | null, periodKey: string): string {
  switch (presentacion?.toLowerCase()) {
    case 'semanal': return `Semana ${periodKey.split('-W')[1]}`;
    case 'quincenal': return periodKey.includes('Q1') ? '1ra Quincena' : '2da Quincena';
    case 'mensual': return format(new Date(periodKey + '-01'), 'MMMM yyyy', { locale: es });
    case 'bimestral': return `Bimestre ${periodKey.split('-B')[1]}`;
    case 'trimestral': return `Trimestre ${periodKey.split('-T')[1]}`;
    case 'semestral': return `Semestre ${periodKey.split('-S')[1]}`;
    case 'anual': return `Año ${periodKey}`;
    default: return periodKey;
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────
export function formatDateShort(fecha: string | null): string {
  if (!fecha) return '-';
  // Append T12:00:00 for date-only strings to avoid UTC-midnight timezone shifts
  const d = new Date(fecha.includes('T') ? fecha : fecha + 'T12:00:00');
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '-';
}

export function getVencimientoInfo(fecha: string | null): { status: 'vencido' | 'urgente' | 'proximo' | 'vigente'; days: number } | null {
  if (!fecha) return null;
  // Append T12:00:00 for date-only strings to avoid UTC-midnight timezone shifts
  const date = new Date(fecha.includes('T') ? fecha : fecha + 'T12:00:00');
  if (!isValid(date)) return null;
  const days = differenceInDays(date, new Date());
  if (isPast(date)) return { status: 'vencido', days };
  if (days <= 30) return { status: 'urgente', days };
  if (days <= 90) return { status: 'proximo', days };
  return { status: 'vigente', days };
}

// ─── Programa to categoría mapping ────────────────────────────────────
export function programaToCategoria(programa: string): string {
  const p = (programa || '').toLowerCase().trim();
  if (p.includes('immex'))                          return 'immex';
  if (p.includes('prosec'))                         return 'prosec';
  if (p.includes('padrón') || p.includes('padron')) return 'padron';
  if (p.includes('iva') || p.includes('ieps') ||
      p.includes('cert') || p.includes('oea'))      return 'cert_iva_ieps';
  return 'general';
}

// ─── Recurrence: next vencimiento calculation ─────────────────────────
function addPeriod(date: Date, presentacion: string): Date {
  switch (presentacion.toLowerCase()) {
    case 'semanal': return addWeeks(date, 1);
    case 'quincenal': return addWeeks(date, 2);
    case 'mensual': return addMonths(date, 1);
    case 'bimestral': return addMonths(date, 2);
    case 'trimestral': return addMonths(date, 3);
    case 'semestral': return addMonths(date, 6);
    case 'anual': return addYears(date, 1);
    default: return date;
  }
}

/**
 * Given a base due date and periodicity, calculates the next upcoming
 * vencimiento that hasn't been completed yet.
 * Returns the original fecha_vencimiento for non-recurring ("unica") obligations.
 */
export function getNextVencimiento(
  fechaVencimiento: string | null,
  presentacion: string | null,
  completedPeriodKeys: Set<string>,
  obligacionId: string
): { date: Date; periodKey: string } | null {
  if (!fechaVencimiento) return null;
  const base = new Date(fechaVencimiento + 'T12:00:00');
  if (!isValid(base)) return null;

  // Non-recurring: return the fixed date
  if (!presentacion || presentacion.toLowerCase() === 'unica') {
    const pk = getCurrentPeriodKey(presentacion);
    return { date: base, periodKey: pk };
  }

  // For recurring: iterate from base forward until we find an uncompleted period
  let current = new Date(base);
  const now = new Date();
  const maxIterations = 120; // safety: ~10 years of monthly

  for (let i = 0; i < maxIterations; i++) {
    const pk = getPeriodKeyForDate(current, presentacion);
    const mapKey = `${obligacionId}:${pk}`;
    
    if (!completedPeriodKeys.has(mapKey)) {
      return { date: current, periodKey: pk };
    }
    current = addPeriod(current, presentacion);
  }

  // All checked periods are completed, return next one
  return { date: current, periodKey: getPeriodKeyForDate(current, presentacion) };
}

/** Get period key for a specific date (not necessarily "now") */
function getPeriodKeyForDate(date: Date, presentacion: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const week = getISOWeek(date);

  switch (presentacion.toLowerCase()) {
    case 'semanal': return `${year}-W${String(week).padStart(2, '0')}`;
    case 'quincenal': {
      const half = date.getDate() <= 15 ? '1' : '2';
      return `${year}-${month}-Q${half}`;
    }
    case 'mensual': return `${year}-${month}`;
    case 'bimestral': {
      const bim = Math.ceil((date.getMonth() + 1) / 2);
      return `${year}-B${bim}`;
    }
    case 'trimestral': {
      const q = Math.ceil((date.getMonth() + 1) / 3);
      return `${year}-T${q}`;
    }
    case 'semestral': {
      const s = date.getMonth() < 6 ? '1' : '2';
      return `${year}-S${s}`;
    }
    case 'anual': return `${year}`;
    default: return `${year}-${month}`;
  }
}

export function isRecurring(presentacion: string | null): boolean {
  return !!presentacion && presentacion.toLowerCase() !== 'unica';
}
