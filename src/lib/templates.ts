import type { Json } from '@/integrations/supabase/types';

/** Subtarea tal como se guarda en `tarea_templates.subtareas_template`. */
export interface SubtareaTemplate {
  titulo: string;
  descripcion?: string;
}

/** Recurrencia tal como se guarda en `tarea_templates.campos_personalizados`. */
export interface CamposTemplate {
  es_recurrente?: boolean;
  frecuencia_recurrencia?: string;
  intervalo_recurrencia?: number;
}

const isRecord = (value: Json | null | undefined): value is { [key: string]: Json | undefined } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Lee `campos_personalizados` (Json) validando el tipo de cada campo. */
export function getCamposTemplate(json: Json | null | undefined): CamposTemplate {
  if (!isRecord(json)) return {};
  const { es_recurrente, frecuencia_recurrencia, intervalo_recurrencia } = json;
  return {
    es_recurrente: typeof es_recurrente === 'boolean' ? es_recurrente : undefined,
    frecuencia_recurrencia: typeof frecuencia_recurrencia === 'string' ? frecuencia_recurrencia : undefined,
    intervalo_recurrencia: typeof intervalo_recurrencia === 'number' ? intervalo_recurrencia : undefined,
  };
}

/** Lee `subtareas_template` (Json) y descarta entradas sin título. */
export function getSubtareasTemplate(json: Json | null | undefined): SubtareaTemplate[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    if (!isRecord(item) || typeof item.titulo !== 'string') return [];
    return [{ titulo: item.titulo, descripcion: typeof item.descripcion === 'string' ? item.descripcion : undefined }];
  });
}
