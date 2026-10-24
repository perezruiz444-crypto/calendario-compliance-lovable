import { includeObligationAction } from '../../supabase/functions/_shared/obligationPresentation.js';
/** Interpretación compartida: un requisito permanente no es una entrega por periodo. */
export type TipoControl = 'periodica' | 'vigencia' | 'evento' | 'condicion' | 'riesgo';
export type EstadoAccion = 'pendiente' | 'cumplida' | 'vencida';
export type OrigenFecha = 'normativa' | 'interna' | 'heredada';

export interface ReglaVista {
  tipo: TipoControl | null;
  clasificacionAprobada: boolean;
  normativaValidada: boolean;
}
export interface ObligacionFuente {
  id: string;
  empresaId: string;
  programa: string;
  activa: boolean;
  aplicable: boolean | null;
  regla: ReglaVista | null;
}
export interface AccionFuente {
  id: string;
  obligacionId: string;
  empresaId: string;
  fecha: string | null;
  origenFecha: OrigenFecha;
  periodo: string | null;
  completada: boolean;
  eventoId: string | null;
}
export interface SeccionesObligacion {
  acciones: AccionFuente[];
  vigencias: ObligacionFuente[];
  condiciones: ObligacionFuente[];
  eventos: ObligacionFuente[];
  porRevisar: ObligacionFuente[];
}
const TYPES: readonly TipoControl[] = ['periodica', 'vigencia', 'evento', 'condicion', 'riesgo'];

export function classifyObligation(regla: ReglaVista | null): TipoControl | 'por_clasificar' {
  return regla?.clasificacionAprobada && regla.tipo && TYPES.includes(regla.tipo)
    ? regla.tipo : 'por_clasificar';
}

/** El inventario describe el seguimiento; no acredita una entrega ni un atraso. */
export function managementFollowupLabel(activa: boolean, regla: ReglaVista | null, metadataReady: boolean): string {
  if (!activa) return 'Inactiva';
  if (!metadataReady) return 'Seguimiento por confirmar';
  switch (classifyObligation(regla)) {
    case 'condicion': return 'Condición permanente';
    case 'evento': return 'Por evento';
    case 'vigencia': return 'Vigencia documental';
    case 'riesgo': return 'Consecuencia del incumplimiento';
    case 'periodica': return 'Entrega periódica';
    default: return 'Por clasificar';
  }
}

export function buildObligationSections(
  obligaciones: readonly ObligacionFuente[], acciones: readonly AccionFuente[]
): SeccionesObligacion {
  const result: SeccionesObligacion = { acciones: [], vigencias: [], condiciones: [], eventos: [], porRevisar: [] };
  const parents = new Map<string, ObligacionFuente>();
  for (const ob of obligaciones) {
    if (!ob.activa || ob.aplicable === false) continue;
    parents.set(ob.id, ob);
    const tipo = classifyObligation(ob.regla);
    if (tipo === 'por_clasificar' || ob.aplicable === null) result.porRevisar.push(ob);
    else if (tipo === 'vigencia') result.vigencias.push(ob);
    else if (tipo === 'condicion') result.condiciones.push(ob);
    else if (tipo === 'evento') result.eventos.push(ob);
    // Riesgos son referencias del control; nunca pendientes ordinarios.
  }
  const seen = new Set<string>();
  for (const accion of acciones) {
    const ob = parents.get(accion.obligacionId);
    if (!ob || ob.empresaId !== accion.empresaId || seen.has(accion.id)) continue;
    const tipo = classifyObligation(ob.regla);
    if (!includeObligationAction(tipo,accion.origenFecha,accion.eventoId)) continue;
    result.acciones.push(accion);
    seen.add(accion.id);
  }
  // Aprobar el tipo no crea periodos ni resuelve un calendario incompleto.
  for (const ob of parents.values()) {
    if (ob.aplicable === true && classifyObligation(ob.regla) === 'periodica'
      && !result.acciones.some(a => a.obligacionId === ob.id)) {
      result.porRevisar.push(ob);
    }
  }
  return result;
}

export function validDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1
    && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function effectiveActionState(accion: AccionFuente, hoy: string): EstadoAccion {
  if (accion.completada) return 'cumplida';
  return validDateKey(accion.fecha) && validDateKey(hoy) && accion.fecha < hoy ? 'vencida' : 'pendiente';
}

export function summarizePeriod(acciones: readonly AccionFuente[], periodo: string) {
  const unique = new Map(acciones.filter(a => a.periodo === periodo || (a.periodo?.startsWith('anexo30:') && validDateKey(a.fecha) && a.fecha.slice(0, 7) === periodo)).map(a => [a.id, a]));
  const total = unique.size;
  const cumplidas = [...unique.values()].filter(a => a.completada).length;
  return { total, cumplidas, pendientes: total - cumplidas, porcentaje: total ? Math.round(cumplidas / total * 100) : null };
}
