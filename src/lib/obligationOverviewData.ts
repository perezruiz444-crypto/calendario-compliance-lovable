import { latestScheduledReviews, selectObligationRule } from '../../supabase/functions/_shared/obligationPresentation.js';
import type { Database, Json } from '../integrations/supabase/types.js';
import type { NewTables } from '../types/obligationOverviewDatabase.js';
import { buildObligationSections, type AccionFuente, type ObligacionFuente, type OrigenFecha, type ReglaVista, type TipoControl } from './obligationModel.js';

type Tables = Database['public']['Tables'];
export type RawObligation = Pick<Tables['obligaciones']['Row'], 'id' | 'empresa_id' | 'catalogo_id' | 'nombre' | 'categoria' | 'descripcion' | 'presentacion' | 'activa' | 'responsable_id' | 'responsable_tipo'> & Partial<Pick<Tables['obligaciones']['Row'], 'fecha_fin' | 'fecha_renovacion'>>;
export type RawOccurrence = Pick<Tables['obligacion_ocurrencias']['Row'], 'id' | 'obligacion_id' | 'empresa_id' | 'periodo_key' | 'fecha_vencimiento' | 'estado'> & { evento_id?: string | null; origen_fecha?: string; fecha_objetivo_interna?: string | null };
export type RawCompletion = Pick<Tables['obligacion_cumplimientos']['Row'], 'obligacion_id' | 'ocurrencia_id' | 'empresa_id' | 'periodo_key' | 'completada' | 'vigente' | 'evidencia_url'> & { evento_id?: string | null };
export type RawRule = Pick<NewTables['obligacion_reglas']['Row'], 'id' | 'catalogo_id' | 'obligacion_id' | 'version' | 'tipo_control' | 'clasificacion_estado' | 'normativa_estado' | 'aplicabilidad'> & { parametros?: Json };
export type RawEvent = Pick<NewTables['obligacion_eventos']['Row'], 'id' | 'obligacion_id' | 'empresa_id' | 'tipo_evento' | 'fecha_evento'> & { evidencia_path?: string | null };
export type RawReview = NewTables['obligacion_revisiones']['Row'];
export type OverviewCompany = Partial<Tables['empresas']['Row']> & Pick<Tables['empresas']['Row'], 'id' | 'razon_social'>;
export type OverviewTask = Pick<Tables['tareas']['Row'], 'id' | 'titulo' | 'empresa_id' | 'fecha_vencimiento' | 'estado' | 'prioridad'>;
export interface OverviewSources {
  empresa: OverviewCompany;
  obligaciones: RawObligation[];
  ocurrencias: RawOccurrence[];
  cumplimientos: RawCompletion[];
  reglas: RawRule[];
  revisiones: RawReview[];
  eventos: RawEvent[];
  relaciones: NewTables['obligacion_relaciones']['Row'][];
  documentos: Tables['documentos']['Row'][];
  tareas: OverviewTask[];
  asignaciones: string[];
  perfiles: { id: string; nombre_completo: string }[];
  metadataReady: boolean;
}
export interface OverviewObligation extends ObligacionFuente {
  catalogoId: string | null;
  nombre: string;
  descripcion: string | null;
  presentacion: string | null;
  asignadaAMi: boolean;
  responsable: string | null;
  ultimaRevision: RawReview | null;
  revisiones: RawReview[];
  riesgos: string[];
  cumplimientosDirectos: RawCompletion[];
}
export interface OverviewAction extends AccionFuente {
  ocurrenciaId: string | null;
  evidenciaPath: string | null;
  objetivoInterno: string | null;
  eventoNombre: string | null;
  eventoFecha: string | null;
}
export interface OverviewValidity {
  id: string;
  nombre: string;
  programa: string;
  fecha: string | null;
  fechaRenovacion: string | null;
}
const TYPES: TipoControl[] = ['periodica', 'vigencia', 'evento', 'condicion', 'riesgo'];

function applicability(value: Json, company: OverviewCompany): boolean | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const [key, expected] of Object.entries(value)) {
    if (!Array.isArray(expected) || expected.length === 0 || !expected.every(v => typeof v === 'string')) return null;
    const actual = key === 'rubro' ? company.cert_iva_ieps_rubro : key === 'modalidad' ? company.immex_modalidad : null;
    if (!actual) return null;
    if (!expected.includes(actual)) return false;
  }
  return true;
}

/** Ninguna fuente cruzada se transforma en una cifra aparentemente sana. */
export function buildOverviewData(source: OverviewSources) {
  const { empresa } = source;
  const allScoped = [...source.obligaciones, ...source.ocurrencias, ...source.revisiones, ...source.eventos, ...source.relaciones, ...source.documentos, ...source.tareas];
  if (allScoped.some(row => row.empresa_id !== empresa.id) || source.cumplimientos.some(row => row.empresa_id != null && row.empresa_id !== empresa.id)) {
    throw new Error('Los registros no corresponden a la empresa seleccionada');
  }
  const assigned = new Set(source.asignaciones);
  const nombres = new Map(source.perfiles.map(p => [p.id, p.nombre_completo]));
  const obligations: OverviewObligation[] = source.obligaciones.map(ob => {
    const approved = selectObligationRule(source.reglas,ob);
    const regla: ReglaVista | null = approved ? {
      tipo: TYPES.find(t => t === approved.tipo_control) ?? null,
      clasificacionAprobada: true, normativaValidada: approved.normativa_estado === 'validada',
    } : null;
    const reviews = source.revisiones.filter(r => r.obligacion_id === ob.id)
      .sort((a, b) => b.revisada_en.localeCompare(a.revisada_en) || b.id.localeCompare(a.id));
    return { id: ob.id, catalogoId: ob.catalogo_id, empresaId: ob.empresa_id, programa: ob.categoria, activa: ob.activa,
      aplicable: approved ? applicability(approved.aplicabilidad, empresa) : true, regla,
      nombre: ob.nombre, descripcion: ob.descripcion, presentacion: ob.presentacion,
      asignadaAMi: assigned.has(ob.id), responsable: ob.responsable_id ? nombres.get(ob.responsable_id) ?? 'Responsable asignado' : null,
      ultimaRevision: reviews[0] ?? null, revisiones: reviews,
      riesgos: source.relaciones.filter(r => r.obligacion_origen_id === ob.id && r.tipo === 'riesgo').map(r => source.obligaciones.find(target => target.id === r.obligacion_destino_id)?.nombre ?? 'Riesgo relacionado'),
      cumplimientosDirectos: source.cumplimientos.filter(c => c.obligacion_id === ob.id && !c.ocurrencia_id && !c.evento_id && c.vigente),
    };
  });
  const current = source.cumplimientos.filter(c => c.vigente);
  const actions: OverviewAction[] = source.ocurrencias.map(oc => {
    const completion = current.find(c => c.obligacion_id === oc.obligacion_id && c.ocurrencia_id === oc.id && c.periodo_key === oc.periodo_key)
      ?? (oc.evento_id ? current.find(c => c.obligacion_id === oc.obligacion_id && c.evento_id === oc.evento_id) : undefined);
    const origenFecha: OrigenFecha = oc.origen_fecha === 'interna' || oc.origen_fecha === 'normativa' ? oc.origen_fecha : 'heredada';
    return { id: oc.id, ocurrenciaId: oc.id, obligacionId: oc.obligacion_id, empresaId: oc.empresa_id,
      periodo: oc.periodo_key, fecha: oc.fecha_vencimiento, origenFecha, completada: completion?.completada ?? false,
      eventoId: oc.evento_id ?? null, evidenciaPath: completion?.evidencia_url ?? null, objetivoInterno: oc.fecha_objetivo_interna ?? null, eventoNombre: source.eventos.find(e=>e.id===oc.evento_id)?.tipo_evento??null, eventoFecha: source.eventos.find(e=>e.id===oc.evento_id)?.fecha_evento??null };
  });
  for (const review of latestScheduledReviews(source.revisiones)) {
    const ob=obligations.find(o=>o.id===review.obligacion_id);
    if(ob?.regla?.tipo==='condicion') actions.push({id:`revision:${review.id}`,obligacionId:ob.id,empresaId:ob.empresaId,fecha:review.proxima_revision,origenFecha:'interna',periodo:null,completada:false,eventoId:null,ocurrenciaId:null,evidenciaPath:null,objetivoInterno:null,eventoNombre:null,eventoFecha:null});
  }
  const linked = new Set(source.ocurrencias.map(oc => oc.evento_id).filter(Boolean));
  for (const event of source.eventos) {
    if (linked.has(event.id)) continue;
    const completion = current.find(c => c.obligacion_id === event.obligacion_id && c.evento_id === event.id);
    actions.push({ id: `evento:${event.id}`, ocurrenciaId: null, obligacionId: event.obligacion_id, empresaId: event.empresa_id,
      periodo: `evento:${event.id}`, fecha: null, origenFecha: 'heredada', completada: completion?.completada ?? false,
      eventoId: event.id, eventoNombre:event.tipo_evento,eventoFecha:event.fecha_evento,evidenciaPath: completion?.evidencia_url ?? null, objetivoInterno: null });
  }
  const vigencias: OverviewValidity[] = [];
  if (empresa.matriz_seguridad_fecha_vencimiento || empresa.matriz_seguridad_fecha_renovar) vigencias.push({ id: 'empresa-matriz', nombre: 'Matriz de Seguridad', programa: 'matriz_seguridad', fecha: empresa.matriz_seguridad_fecha_vencimiento ?? null, fechaRenovacion: empresa.matriz_seguridad_fecha_renovar ?? null });
  if (empresa.cert_iva_ieps_oficio || empresa.cert_iva_ieps_fecha_vencimiento) vigencias.push({ id: 'empresa-certiva', nombre: 'Certificación IVA/IEPS', programa: 'cert_iva_ieps', fecha: empresa.cert_iva_ieps_fecha_vencimiento ?? null, fechaRenovacion: empresa.cert_iva_ieps_fecha_renovar ?? null });
  if (empresa.immex_numero) vigencias.push({ id: 'empresa-immex', nombre: 'Autorización IMMEX', programa: 'immex', fecha: empresa.immex_fecha_fin ?? null, fechaRenovacion: null });
  if (empresa.prosec_numero) vigencias.push({ id: 'empresa-prosec', nombre: 'Autorización PROSEC', programa: 'prosec', fecha: empresa.prosec_fecha_fin ?? null, fechaRenovacion: empresa.prosec_fecha_siguiente_renovacion ?? null });
  for (const doc of source.documentos) if (doc.fecha_vencimiento) vigencias.push({ id: `doc:${doc.id}`, nombre: doc.nombre, programa: doc.categoria ?? 'general', fecha: doc.fecha_vencimiento, fechaRenovacion: null });
  const secciones = buildObligationSections(obligations, actions);
  return { empresa, obligaciones: obligations, acciones: actions, secciones, vigencias,
    eventos:source.eventos, tareas: source.tareas.filter(t => t.estado !== 'cancelada'), metadataReady: source.metadataReady };
}
export type OverviewData = ReturnType<typeof buildOverviewData>;
