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
