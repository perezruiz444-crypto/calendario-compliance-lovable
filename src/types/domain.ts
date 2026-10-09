/**
 * Aliases de tipos del dominio basados en los tipos auto-generados por Supabase.
 * Usar estos en lugar de `any` en componentes y hooks.
 */
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

export type Empresa = Tables['empresas']['Row'];
export type EmpresaInsert = Tables['empresas']['Insert'];
export type EmpresaUpdate = Tables['empresas']['Update'];

export type Obligacion = Tables['obligaciones']['Row'];
export type ObligacionInsert = Tables['obligaciones']['Insert'];
export type ObligacionCatalogo = Tables['obligaciones_catalogo']['Row'];

export type Tarea = Tables['tareas']['Row'];
export type TareaInsert = Tables['tareas']['Insert'];

export type EmpresaPrograma = Tables['empresa_programas']['Row'];
export type EmpresaProgramaInsert = Tables['empresa_programas']['Insert'];

export type ObligacionCumplimiento = Tables['obligacion_cumplimientos']['Row'];

/**
 * Fase 2 — modelo de ocurrencias (tabla `obligacion_ocurrencias`).
 * Tipos generados por Supabase tras aplicar 20260721100000/100001.
 */
export type ObligacionOcurrencia = Tables['obligacion_ocurrencias']['Row'];
export type ObligacionOcurrenciaInsert = Tables['obligacion_ocurrencias']['Insert'];

/** Ocurrencia con su obligación (join frecuente para render de listas/calendario). */
export type OcurrenciaConObligacion = ObligacionOcurrencia & {
  obligaciones?: Pick<Obligacion, 'id' | 'nombre' | 'categoria' | 'presentacion' | 'descripcion'> & {
    empresas?: { razon_social: string | null } | null;
  } | null;
};

export type DomicilioOperacion = Tables['domicilios_operacion']['Row'];
export type AgenteAduanal = Tables['agentes_aduanales']['Row'];
export type ApoderadoLegal = Tables['apoderados_legales']['Row'];

export type Profile = Tables['profiles']['Row'];
export type Notificacion = Tables['notificaciones']['Row'];

// Tareas con joins frecuentes
export type TareaConJoins = Tarea & {
  profiles?: { nombre_completo: string | null } | null;
  categorias_tareas?: { nombre: string; color: string | null } | null;
};

// ── Resúmenes y joins usados en selectores y formularios ───────────────────
/** Empresa tal como la devuelven los selectores (`select('id, razon_social')`). */
export type EmpresaResumen = Pick<Empresa, 'id' | 'razon_social'>;
/** Consultor tal como lo devuelven los selectores (`select('id, nombre_completo')`). */
export type ConsultorResumen = Pick<Profile, 'id' | 'nombre_completo'>;
export type CategoriaTarea = Tables['categorias_tareas']['Row'];

/** Plantilla de tarea con su categoría (`select('*, categorias_tareas(nombre, color)')`). */
export type TareaTemplate = Tables['tarea_templates']['Row'] & {
  categorias_tareas?: { nombre: string; color: string | null } | null;
};

/** Archivo adjunto de una tarea, tal como se guarda en `tareas.archivos_adjuntos`. */
// `type` (no `interface`) para que sea asignable a `Json` al guardarlo en `archivos_adjuntos`.
export type TareaAdjunto = {
  name: string;
  path: string;
  size: number;
  type: string;
};

/** Tarea abierta en el detalle: fila + joins de `select('*, empresas(...), categorias_tareas(...)')`. */
export type TareaDetalle = Omit<Tarea, 'archivos_adjuntos'> & {
  /** Ya validados con `getAdjuntos` al cargar (en BD es `Json`). */
  archivos_adjuntos: TareaAdjunto[] | null;
  empresas?: { razon_social: string } | null;
  categorias_tareas?: { id?: string; nombre: string; color: string | null } | null;
  consultor_profile?: ConsultorResumen | null;
  creador_profile?: ConsultorResumen | null;
  /** Variante del diálogo: consultor asignado y creador. */
  profiles?: ConsultorResumen | null;
  creador?: ConsultorResumen | null;
};

export type Comentario = Tables['comentarios']['Row'] & {
  profiles?: { nombre_completo: string } | null;
};

export type Subtarea = Tables['subtareas']['Row'] & {
  profiles?: { nombre_completo: string } | null;
};

export type CustomField = Tables['custom_fields']['Row'];

export type TimeEntry = Tables['time_entries']['Row'] & {
  profiles?: { nombre_completo: string } | null;
};

export type TareaAsignacion = Tables['tarea_asignaciones']['Row'] & {
  profiles?: { nombre_completo: string } | null;
};

export type TareaResumen = Pick<Tarea, 'id' | 'titulo' | 'estado'>;

/** Dependencia con la tarea relacionada (`tareas:tarea_id(...)` o `tareas:depende_de_tarea_id(...)`). */
export type TareaDependencia = {
  id: string;
  tipo: string | null;
  tareas: TareaResumen | null;
};
