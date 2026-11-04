/** Las columnas date representan días civiles, no instantes UTC. */
export const COMPLIANCE_TIME_ZONE = 'America/Mexico_City';

export function mexicoDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: COMPLIANCE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

function dateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/** Adaptador para date-fns y selectores: conserva el día local de una columna date.
 * Los timestamps con hora conservan su semántica de instante.
 */
export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
  const date = dateOnly(value);
  if (!date) return new Date(NaN);
  const local = new Date(0);
  local.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  local.setHours(12, 0, 0, 0);
  return local;
}

/** Formato independiente de la zona del navegador/servidor para columnas date. */
export function formatCalendarDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  const date = dateOnly(value);
  if (!date && /^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Fecha de calendario inválida');
  return new Intl.DateTimeFormat('es-MX', { ...options, timeZone: date ? 'UTC' : COMPLIANCE_TIME_ZONE }).format(date ?? new Date(value));
}

export function addCalendarDays(value: string, days: number): string {
  const date = dateOnly(value);
  if (!date) throw new RangeError('Fecha de calendario inválida');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Próxima renovación, incluyendo hoy y ajustando al último día del mes. */
export function nextRenewalDate(value: string, months: number, today = mexicoDateKey()): string | null {
  const base = dateOnly(value);
  if (!base || !dateOnly(today) || !Number.isInteger(months) || months <= 0) return null;
  const target = dateOnly(today)!;
  const elapsed = (target.getUTCFullYear() - base.getUTCFullYear()) * 12 + target.getUTCMonth() - base.getUTCMonth();
  let periods = Math.max(0, Math.floor(elapsed / months));
  for (;;) {
    const date = new Date(base);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + periods * months);
    const last = new Date(date);
    last.setUTCMonth(last.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(base.getUTCDate(), last.getUTCDate()));
    const key = date.toISOString().slice(0, 10);
    if (key >= today) return key;
    periods++;
  }
}

/** Diferencia de días calendario contra hoy en México; nunca bloques de 24 horas. */
export function calendarDaysUntil(value: string, reference: Date | string = new Date()): number {
  const instant = new Date(value);
  const target = dateOnly(value) ?? (/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(instant.getTime()) ? null : dateOnly(mexicoDateKey(instant)));
  const today = dateOnly(typeof reference === 'string' ? reference : mexicoDateKey(reference));
  return target && today ? Math.round((target.getTime() - today.getTime()) / 86400000) : NaN;
}

export function getVencimientoInfo(fecha: string | null, now = new Date()): { status: 'vencido' | 'urgente' | 'proximo' | 'vigente'; days: number } | null {
  if (!fecha) return null;
  const days = calendarDaysUntil(fecha, now);
  if (!Number.isFinite(days)) return null;
  return { status: days < 0 ? 'vencido' : days <= 30 ? 'urgente' : days <= 90 ? 'proximo' : 'vigente', days };
}
