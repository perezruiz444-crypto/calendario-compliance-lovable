import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { format, differenceInDays, isPast, isValid, getISOWeek, addWeeks, addMonths, addYears, addDays, setISOWeek, startOfISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Category constants ───────────────────────────────────────────────
export const CATEGORIA_LABELS: Record<string, string> = {
  general: 'General',
  cert_iva_ieps: 'Cert. IVA/IEPS',
  immex: 'IMMEX',
  prosec: 'PROSEC',
  padron_general: 'Padrón General',
  padron_sectorial: 'Padrón Sectorial',
  padron: 'Padrón',
  otro: 'Otro',
};

export const CATEGORIA_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cert_iva_ieps: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  immex: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  prosec: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  padron_general: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  padron_sectorial: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  padron: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  otro: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

export const PROGRAMA_LABELS: Record<string, string> = {
  immex:            'IMMEX',
  prosec:           'PROSEC',
  padron_general:   'Padrón General',
  padron_sectorial: 'Padrón Sectorial',
  padron:           'Padrón',
  cert_iva_ieps:    'Certificación IVA/IEPS',
  general:          'General',
  otro:             'Otro',
};

export const PROGRAMA_DESCRIPTIONS: Record<string, string> = {
  immex:            'Industria Manufacturera, Maquiladora y de Servicios de Exportación',
  prosec:           'Programa de Promoción Sectorial',
  padron_general:   'Padrón de Importadores SAT (registro base)',
  padron_sectorial: 'Padrones Sectoriales específicos (Anexo 10 RGCE)',
  padron:           'Padrón de Importadores SAT',
  cert_iva_ieps:    'Certificación de IVA e IEPS ante el SAT',
  general:          'Obligaciones generales de comercio exterior',
  otro:             'Otras obligaciones',
};

// Orden canónico de programas (UI, reportes, onboarding)
export const PROGRAMAS_ORDEN = [
  'immex',
  'prosec',
  'padron_general',
  'padron_sectorial',
  'cert_iva_ieps',
  'general',
] as const;
export type ProgramaKey = typeof PROGRAMAS_ORDEN[number];

/**
 * Fetcha cumplimientos para un conjunto de obligaciones y devuelve un Set con keys "obligacion_id:periodo_key".
 * Útil cuando solo necesitas saber qué cumplimientos existen (no el estado de `completada`).
 */
export async function fetchCumplimientoKeys(
  supabaseClient: SupabaseClient<Database>,
  obligacionIds: string[]
): Promise<Set<string>> {
  if (obligacionIds.length === 0) return new Set();
  const { data } = await supabaseClient
    .from('obligacion_cumplimientos')
    .select('obligacion_id, periodo_key')
    .in('obligacion_id', obligacionIds)
    .eq('vigente', true)
    .eq('completada', true);
  return new Set((data || []).map((c) => `${c.obligacion_id}:${c.periodo_key}`));
}

// ─── Period key helpers ───────────────────────────────────────────────
/** Período actual (basado en hoy). Atajo de getPeriodKeyForDate(new Date(), presentacion). */
export function getCurrentPeriodKey(presentacion: string | null): string {
  return getPeriodKeyForDate(new Date(), presentacion);
}

/**
 * Etiqueta legible de un periodo. Se deduce del formato de la clave (no de `presentacion`, que es
 * texto libre como "Revisión periódica semanal (cada viernes)"): "2026-W30" → "Semana 30 · 20–26 jul",
 * "2026-10" → "Octubre 2026", "2026-T4" → "4º trimestre 2026", "2026" → "Año 2026".
 */
export function getPeriodLabel(presentacion: string | null, periodKey: string): string {
  let m: RegExpMatchArray | null;
  if ((m = periodKey.match(/^(\d{4})-W(\d{1,2})$/))) {
    const inicio = startOfISOWeek(setISOWeek(new Date(Number(m[1]), 0, 4), Number(m[2])));
    const fin = addDays(inicio, 6);
    const rango = inicio.getMonth() === fin.getMonth()
      ? `${format(inicio, 'd')}–${format(fin, 'd MMM', { locale: es })}`
      : `${format(inicio, 'd MMM', { locale: es })} – ${format(fin, 'd MMM', { locale: es })}`;
    return `Semana ${Number(m[2])} · ${rango}`;
  }
  if ((m = periodKey.match(/^(\d{4})-(\d{2})-Q([12])$/))) {
    const mes = format(new Date(Number(m[1]), Number(m[2]) - 1, 1), 'MMM yyyy', { locale: es });
    return `${m[3] === '1' ? '1ra' : '2da'} quincena ${mes}`;
  }
  if ((m = periodKey.match(/^(\d{4})-(\d{2})$/))) {
    const label = format(new Date(Number(m[1]), Number(m[2]) - 1, 1), 'MMMM yyyy', { locale: es });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if ((m = periodKey.match(/^(\d{4})-B(\d)$/))) return `Bimestre ${m[2]} ${m[1]}`;
  if ((m = periodKey.match(/^(\d{4})-T(\d)$/))) return `${m[2]}º trimestre ${m[1]}`;
  if ((m = periodKey.match(/^(\d{4})-S(\d)$/))) return `${m[2]}º semestre ${m[1]}`;
  if (/^\d{4}$/.test(periodKey)) return `Año ${periodKey}`;
  return periodKey;
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
  if (p === 'padron_general')                       return 'padron_general';
  if (p === 'padron_sectorial')                     return 'padron_sectorial';
  if (p.includes('immex'))                          return 'immex';
  if (p.includes('prosec'))                         return 'prosec';
  if (p.includes('sectorial'))                      return 'padron_sectorial';
  if (p.includes('general') && p.includes('padr'))  return 'padron_general';
  if (p.includes('padrón') || p.includes('padron')) return 'padron_general';
  if (p.includes('iva') || p.includes('ieps') ||
      p.includes('cert'))                           return 'cert_iva_ieps';
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

/** Genera la "period key" para una fecha y presentación dadas. */
export function getPeriodKeyForDate(date: Date, presentacion: string | null): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const week = getISOWeek(date);

  switch (presentacion?.toLowerCase()) {
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


/** Ids de las ocurrencias con un cumplimiento vigente y completado. */
export function ocurrenciasCumplidas(
  cumplimientos: ReadonlyArray<{ ocurrencia_id: string | null; completada: boolean | null; vigente: boolean | null }> | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const c of cumplimientos ?? []) {
    if (c.vigente && c.completada && c.ocurrencia_id) ids.add(c.ocurrencia_id);
  }
  return ids;
}

export interface OcurrenciaRef {
  id: string;
  obligacion_id: string;
  periodo_key: string;
  fecha_vencimiento: string;
}

export interface EstadoObligacionOc {
  /** Ocurrencia del periodo en curso (la que define si la obligación está cumplida hoy). */
  actual: OcurrenciaRef;
  cumplida: boolean;
  /** Ocurrencias anteriores a la actual, ya vencidas y sin cumplimiento. */
  atrasadas: number;
}

/** Clave de periodo de `fecha` con el mismo formato que `periodoKey` ("2026", "2026-10", "2026-T3"…). */
function periodoKeyComo(periodoKey: string, fecha: Date): string | null {
  const formato: [RegExp, string][] = [
    [/^\d{4}$/, 'anual'],
    [/^\d{4}-\d{2}$/, 'mensual'],
    [/^\d{4}-\d{2}-Q[12]$/, 'quincenal'],
    [/^\d{4}-W\d{2}$/, 'semanal'],
    [/^\d{4}-B\d$/, 'bimestral'],
    [/^\d{4}-T\d$/, 'trimestral'],
    [/^\d{4}-S\d$/, 'semestral'],
  ];
  const match = formato.find(([re]) => re.test(periodoKey));
  return match ? getPeriodKeyForDate(fecha, match[1]) : null;
}

/**
 * Cada ocurrencia (mes, año…) es independiente. La obligación se evalúa por la ocurrencia del
 * periodo en curso (p. ej. octubre 2026 para una mensual, aunque ya haya vencido el día 17); si
 * ninguna corresponde al periodo actual, la próxima por vencer, o la última. Las anteriores sin
 * cumplir se cuentan aparte como atrasadas, sin cambiar el estado de la actual.
 * `ocs` debe venir ordenado por fecha_vencimiento ascendente.
 */
export function estadoPorOcurrencias(
  ocs: readonly OcurrenciaRef[],
  hechas: ReadonlySet<string>,
  hoy: Date = new Date(),
): Map<string, EstadoObligacionOc> {
  const porObligacion = new Map<string, OcurrenciaRef[]>();
  for (const oc of ocs) {
    const lista = porObligacion.get(oc.obligacion_id) ?? [];
    lista.push(oc);
    porObligacion.set(oc.obligacion_id, lista);
  }
  const hoyStr = format(hoy, 'yyyy-MM-dd');
  const estado = new Map<string, EstadoObligacionOc>();
  for (const [obligacionId, lista] of porObligacion) {
    const actual =
      lista.find((oc) => periodoKeyComo(oc.periodo_key, hoy) === oc.periodo_key) ??
      lista.find((oc) => oc.fecha_vencimiento >= hoyStr) ??
      lista[lista.length - 1];
    const atrasadas = lista.filter(
      (oc) => oc.id !== actual.id && oc.fecha_vencimiento < hoyStr
        && oc.fecha_vencimiento <= actual.fecha_vencimiento && !hechas.has(oc.id),
    ).length;
    estado.set(obligacionId, { actual, cumplida: hechas.has(actual.id), atrasadas });
  }
  return estado;
}

/**
 * Estado por ocurrencias (ver estadoPorOcurrencias) de varias obligaciones.
 * Las obligaciones sin ocurrencias (legado) no aparecen: ahí sigue valiendo la clave
 * `${obligacion_id}:${getCurrentPeriodKey(presentacion)}`. No sirve para las que tienen
 * ocurrencias porque `presentacion` es texto libre ("Anualmente en marzo") y getCurrentPeriodKey
 * le asigna el mes actual aunque la ocurrencia se haya guardado con periodo "2026".
 */
export async function fetchEstadoOcurrencias(
  supabaseClient: SupabaseClient<Database>,
  obligacionIds: string[]
): Promise<Map<string, EstadoObligacionOc>> {
  if (obligacionIds.length === 0) return new Map();
  const [{ data: ocs }, { data: cumpl }] = await Promise.all([
    supabaseClient
      .from('obligacion_ocurrencias')
      .select('id, obligacion_id, periodo_key, fecha_vencimiento')
      .in('obligacion_id', obligacionIds)
      .order('fecha_vencimiento', { ascending: true }),
    supabaseClient
      .from('obligacion_cumplimientos')
      .select('ocurrencia_id, completada, vigente')
      .in('obligacion_id', obligacionIds)
      .eq('vigente', true),
  ]);
  return estadoPorOcurrencias(ocs ?? [], ocurrenciasCumplidas(cumpl));
}

/** Atajo de fetchEstadoOcurrencias: solo si la ocurrencia actual está cumplida. */
export async function fetchCumplidasPorOcurrencias(
  supabaseClient: SupabaseClient<Database>,
  obligacionIds: string[]
): Promise<Map<string, boolean>> {
  const estado = await fetchEstadoOcurrencias(supabaseClient, obligacionIds);
  return new Map([...estado].map(([id, e]) => [id, e.cumplida]));
}

/**
 * Marca o desmarca el cumplimiento de una ocurrencia (append-only).
 * Si ya hay una fila vigente para (obligacion_id, periodo_key) —aunque la UI la creyera ausente,
 * p. ej. un periodo desmarcado antes— se corrige con la RPC `corregir_cumplimiento`; si no, se inserta.
 * Insertar a ciegas chocaba con el índice único `obligacion_cumplimientos_vigente_unico`.
 */
export async function guardarCumplimiento(
  supabaseClient: SupabaseClient<Database>,
  params: { ocurrencia: OcurrenciaRef; empresaId: string; userId: string; completada: boolean },
): Promise<{ error: Error | null }> {
  const { ocurrencia, empresaId, userId, completada } = params;
  const { data: existing, error: readError } = await supabaseClient
    .from('obligacion_cumplimientos')
    .select('id, completada')
    .eq('obligacion_id', ocurrencia.obligacion_id)
    .eq('periodo_key', ocurrencia.periodo_key)
    .eq('vigente', true)
    .maybeSingle();
  if (readError) return { error: readError };

  if (existing) {
    if (existing.completada === completada) return { error: null };
    const { error } = await supabaseClient.rpc('corregir_cumplimiento', {
      p_cumplimiento_id: existing.id,
      p_completada: completada,
    });
    return { error };
  }

  const { error } = await supabaseClient.from('obligacion_cumplimientos').insert({
    obligacion_id: ocurrencia.obligacion_id,
    ocurrencia_id: ocurrencia.id,
    empresa_id: empresaId,
    periodo_key: ocurrencia.periodo_key,
    completada,
    completada_por: userId,
  });
  return { error };
}
