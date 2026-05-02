import { differenceInDays, parseISO, subMonths, getISOWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoriaReportData, ObligacionCategoriaItem, CumplimientoMensualData } from './pdfGenerator';

export type { CategoriaReportData, ObligacionCategoriaItem, CumplimientoMensualData };

/**
 * Returns the reference date for the given report period.
 * mes_actual  → current month
 * mes_anterior → previous month
 * trimestre   → 3 months ago (start of range; use current month for period key)
 * anio        → current month (annual obligations key by year)
 */
function getRefDateForPeriod(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'mes_anterior': return subMonths(now, 1);
    case 'trimestre':    return now; // trimestre covers current + recent; use current date
    case 'anio':         return now; // annual obligations key by full year
    default:             return now; // mes_actual
  }
}

/**
 * Computes the periodo_key for a given date and presentacion,
 * mirroring the logic in getPeriodKeyForDate / getCurrentPeriodKey.
 */
function getPeriodKeyForDateLocal(date: Date, presentacion: string | null): string {
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

function calcRiesgo(diasRestantes: number | null, completada: boolean): 'alto' | 'medio' | 'bajo' {
  if (completada) return 'bajo';
  if (diasRestantes === null) return 'medio';
  if (diasRestantes <= 7) return 'alto';
  if (diasRestantes <= 30) return 'medio';
  return 'bajo';
}

export async function buildCategoriaReportData(
  supabase: SupabaseClient,
  empresa: { id: string; razon_social: string; rfc?: string },
  categoria: string,
  period: string
): Promise<CategoriaReportData> {
  const today = new Date();

  const { data: obligaciones, error } = await supabase
    .from('obligaciones')
    .select('id, nombre, presentacion, fecha_vencimiento, activa')
    .eq('empresa_id', empresa.id)
    .eq('categoria', categoria)
    .eq('activa', true);

  if (error) throw error;
  if (!obligaciones || obligaciones.length === 0) {
    return {
      categoria,
      empresa: { razon_social: empresa.razon_social, rfc: empresa.rfc },
      period,
      obligaciones: [],
      resumen: { total: 0, completadas: 0, pendientes: 0, vencenEn30: 0, vencenEn90: 0, tasaCumplimiento: 0 },
    };
  }

  const ids = obligaciones.map(ob => ob.id);
  const refDate = getRefDateForPeriod(period);
  const { data: cumplimientos } = await supabase
    .from('obligacion_cumplimientos')
    .select('obligacion_id, periodo_key, completada')
    .in('obligacion_id', ids)
    .eq('completada', true);

  // Build a set keyed by "obligacion_id:periodo_key" to filter by the correct period
  const completadasSet = new Set(
    (cumplimientos || []).map(c => `${c.obligacion_id}:${c.periodo_key}`)
  );

  const items: ObligacionCategoriaItem[] = obligaciones.map(ob => {
    const periodoKey = getPeriodKeyForDateLocal(refDate, ob.presentacion);
    const completada = completadasSet.has(`${ob.id}:${periodoKey}`);
    const diasRestantes = ob.fecha_vencimiento
      ? differenceInDays(parseISO(ob.fecha_vencimiento), today)
      : null;

    return {
      nombre: ob.nombre,
      empresa: empresa.razon_social,
      fecha_vencimiento: ob.fecha_vencimiento,
      dias_restantes: diasRestantes,
      completada,
      presentacion: ob.presentacion,
      riesgo: calcRiesgo(diasRestantes, completada),
    };
  });

  const completadasCount = items.filter(ob => ob.completada).length;
  const pendientesCount = items.length - completadasCount;
  const vencenEn30 = items.filter(ob => !ob.completada && ob.dias_restantes !== null && ob.dias_restantes <= 30).length;
  const vencenEn90 = items.filter(ob => !ob.completada && ob.dias_restantes !== null && ob.dias_restantes <= 90).length;
  const tasaCumplimiento = items.length > 0 ? Math.round((completadasCount / items.length) * 100) : 0;

  return {
    categoria,
    empresa: { razon_social: empresa.razon_social, rfc: empresa.rfc },
    period,
    obligaciones: items,
    resumen: {
      total: items.length,
      completadas: completadasCount,
      pendientes: pendientesCount,
      vencenEn30,
      vencenEn90,
      tasaCumplimiento,
    },
  };
}

// ── Category order for Cumplimiento Mensual ──────────────────────────
const CUMPLIMIENTO_CAT_ORDER = ['immex', 'prosec', 'cert_iva_ieps', 'padron', 'general', 'otro'];
const CUMPLIMIENTO_CAT_LABELS: Record<string, string> = {
  immex: 'IMMEX',
  prosec: 'PROSEC',
  cert_iva_ieps: 'Cert. IVA/IEPS',
  padron: 'Padrón Importadores',
  general: 'OEA / General',
  otro: 'Otras Obligaciones',
};

export async function buildCumplimientoMensualData(
  supabase: SupabaseClient,
  empresa: { id: string; razon_social: string; rfc?: string },
  periodoKey: string,   // formato "2025-05"
  periodLabel: string
): Promise<CumplimientoMensualData> {
  // 1. Query obligaciones activas
  const { data: obligaciones, error } = await supabase
    .from('obligaciones')
    .select('id, nombre, categoria, presentacion, fecha_vencimiento')
    .eq('empresa_id', empresa.id)
    .eq('activa', true);

  if (error) throw error;

  if (!obligaciones || obligaciones.length === 0) {
    return {
      empresa: { razon_social: empresa.razon_social, rfc: empresa.rfc },
      period: periodoKey,
      periodLabel,
      categorias: [],
      resumen: { total: 0, completadas: 0, pendientes: 0, tasaCumplimiento: 0 },
    };
  }

  // 2. Query cumplimientos para el período
  const ids = obligaciones.map(ob => ob.id);
  const { data: cumplimientos } = await supabase
    .from('obligacion_cumplimientos')
    .select('obligacion_id, periodo_key, completada, completada_en, notas')
    .in('obligacion_id', ids)
    .eq('periodo_key', periodoKey);

  // Mapa: obligacion_id → cumplimiento
  const cumplimientoMap = new Map<string, { completada: boolean; completada_en: string | null; notas: string | null }>();
  for (const c of (cumplimientos || [])) {
    cumplimientoMap.set(c.obligacion_id, {
      completada: c.completada ?? false,
      completada_en: c.completada_en ?? null,
      notas: c.notas ?? null,
    });
  }

  // 3. Agrupar por categoría
  const catMap = new Map<string, CumplimientoMensualData['categorias'][number]>();
  for (const key of CUMPLIMIENTO_CAT_ORDER) {
    catMap.set(key, { key, label: CUMPLIMIENTO_CAT_LABELS[key] || key, obligaciones: [] });
  }

  for (const ob of obligaciones) {
    const catKey = CUMPLIMIENTO_CAT_ORDER.includes(ob.categoria) ? ob.categoria : 'otro';
    const entry = catMap.get(catKey)!;
    const cumpl = cumplimientoMap.get(ob.id);
    entry.obligaciones.push({
      nombre: ob.nombre,
      presentacion: ob.presentacion ?? null,
      fecha_vencimiento: ob.fecha_vencimiento ?? null,
      completada: cumpl?.completada ?? false,
      completada_en: cumpl?.completada_en ?? null,
      notas: cumpl?.notas ?? null,
    });
  }

  const categorias = CUMPLIMIENTO_CAT_ORDER.map(k => catMap.get(k)!).filter(c => c.obligaciones.length > 0);

  // 4. Resumen global
  const total = obligaciones.length;
  const completadas = Array.from(cumplimientoMap.values()).filter(c => c.completada).length;
  const pendientes = total - completadas;
  const tasaCumplimiento = total > 0 ? Math.round((completadas / total) * 100) : 0;

  return {
    empresa: { razon_social: empresa.razon_social, rfc: empresa.rfc },
    period: periodoKey,
    periodLabel,
    categorias,
    resumen: { total, completadas, pendientes, tasaCumplimiento },
  };
}
