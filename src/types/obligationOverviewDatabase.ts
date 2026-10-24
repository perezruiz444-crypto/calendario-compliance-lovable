// Generado desde el esquema PostgreSQL local de 20261014190000.
// Extiende tipos legados sin regenerar ni perder tablas ajenas a este cambio.
import type { Database, Json } from '../integrations/supabase/types.js';

type ExtraOccurrence = { regla_id: string | null; regla_snapshot: Json | null; evento_id: string | null; origen_fecha: string; fecha_objetivo_interna: string | null };
type ExtraCompletion = { evento_id: string | null };
type Extended<T extends { Row: object; Insert: object; Update: object; Relationships: unknown }, E> = {
 Row: T['Row'] & E; Insert: T['Insert'] & Partial<E>; Update: T['Update'] & Partial<E>; Relationships: T['Relationships'];
};
export type OverviewDatabase = Omit<Database, 'public'> & { public: Omit<Database['public'], 'Tables' | 'Functions'> & {
 Tables: Omit<Database['public']['Tables'], 'obligacion_ocurrencias' | 'obligacion_cumplimientos'> & NewTables & {
  obligacion_ocurrencias: Extended<Database['public']['Tables']['obligacion_ocurrencias'], ExtraOccurrence>;
  obligacion_cumplimientos: Extended<Database['public']['Tables']['obligacion_cumplimientos'], ExtraCompletion>;
 };
 Functions: Database['public']['Functions'] & {
  previsualizar_anexo30: { Args: { p_obligacion_id: string; p_frecuencia: string; p_origen: string }; Returns: Json };
  programar_anexo30: { Args: { p_obligacion_id: string; p_frecuencia: string; p_origen: string }; Returns: string };
  registrar_cumplimiento_obligacion: { Args: { p_obligacion_id: string; p_periodo_key: string; p_ocurrencia_id?: string; p_evento_id?: string; p_evidencia_path?: string; p_notas?: string }; Returns: string };
  obligacion_v2_puede_registrar: { Args: { p_obligacion_id: string }; Returns: boolean };
  generar_mis_avisos_obligaciones: { Args: Record<PropertyKey,never>; Returns: number };
  registrar_revision_obligacion: { Args: { p_obligacion_id: string; p_resultado: string; p_notas?: string; p_evidencia_path?: string; p_proxima_revision?: string }; Returns: string };
  registrar_evento_obligacion: { Args: { p_obligacion_id: string; p_tipo_evento: string; p_fecha_evento: string; p_idempotency_key: string; p_evidencia_path?: string }; Returns: string };
 };
}};
export type NewTables = {
  obligacion_eventos: {
    Row: {
      id: string;
      empresa_id: string;
      obligacion_id: string;
      tipo_evento: string;
      fecha_evento: string;
      evidencia_path: string | null;
      creado_por: string;
      idempotency_key: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      empresa_id: string;
      obligacion_id: string;
      tipo_evento: string;
      fecha_evento: string;
      evidencia_path?: string | null;
      creado_por?: string;
      idempotency_key: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      empresa_id?: string;
      obligacion_id?: string;
      tipo_evento?: string;
      fecha_evento?: string;
      evidencia_path?: string | null;
      creado_por?: string;
      idempotency_key?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  obligacion_reglas: {
    Row: {
      id: string;
      catalogo_id: string | null;
      obligacion_id: string | null;
      version: number;
      tipo_control: string;
      origen_control: string;
      clasificacion_estado: string;
      normativa_estado: string;
      aplicabilidad: Json;
      parametros: Json;
      fuente_url: string | null;
      fuente_referencia: string | null;
      validada_por: string | null;
      validada_en: string | null;
      created_by: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      catalogo_id?: string | null;
      obligacion_id?: string | null;
      version: number;
      tipo_control: string;
      origen_control: string;
      clasificacion_estado?: string;
      normativa_estado?: string;
      aplicabilidad?: Json;
      parametros?: Json;
      fuente_url?: string | null;
      fuente_referencia?: string | null;
      validada_por?: string | null;
      validada_en?: string | null;
      created_by?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      catalogo_id?: string | null;
      obligacion_id?: string | null;
      version?: number;
      tipo_control?: string;
      origen_control?: string;
      clasificacion_estado?: string;
      normativa_estado?: string;
      aplicabilidad?: Json;
      parametros?: Json;
      fuente_url?: string | null;
      fuente_referencia?: string | null;
      validada_por?: string | null;
      validada_en?: string | null;
      created_by?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  obligacion_relaciones: {
    Row: {
      id: string;
      empresa_id: string;
      obligacion_origen_id: string;
      obligacion_destino_id: string;
      tipo: string;
      created_by: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      empresa_id: string;
      obligacion_origen_id: string;
      obligacion_destino_id: string;
      tipo: string;
      created_by?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      empresa_id?: string;
      obligacion_origen_id?: string;
      obligacion_destino_id?: string;
      tipo?: string;
      created_by?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  obligacion_revisiones: {
    Row: {
      id: string;
      empresa_id: string;
      obligacion_id: string;
      resultado: string;
      revisada_en: string;
      revisada_por: string;
      evidencia_path: string | null;
      notas: string | null;
      proxima_revision: string | null;
    };
    Insert: {
      id?: string;
      empresa_id: string;
      obligacion_id: string;
      resultado: string;
      revisada_en?: string;
      revisada_por?: string;
      evidencia_path?: string | null;
      notas?: string | null;
      proxima_revision?: string | null;
    };
    Update: {
      id?: string;
      empresa_id?: string;
      obligacion_id?: string;
      resultado?: string;
      revisada_en?: string;
      revisada_por?: string;
      evidencia_path?: string | null;
      notas?: string | null;
      proxima_revision?: string | null;
    };
    Relationships: [];
  };
};
