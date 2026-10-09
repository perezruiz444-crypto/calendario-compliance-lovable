import type { Json } from '@/integrations/supabase/types';
import type { TareaAdjunto } from '@/types/domain';

/** Lee `tareas.archivos_adjuntos` (Json) y descarta entradas con forma inválida. */
export function getAdjuntos(json: Json | null | undefined): TareaAdjunto[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return [];
    const { name, path, size, type } = item;
    if (typeof name !== 'string' || typeof path !== 'string') return [];
    return [{ name, path, size: typeof size === 'number' ? size : 0, type: typeof type === 'string' ? type : '' }];
  });
}
