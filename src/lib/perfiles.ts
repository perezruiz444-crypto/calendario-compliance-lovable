import { supabase } from '@/integrations/supabase/client';
import type { ConsultorResumen } from '@/types/domain';

/**
 * Une el nombre del usuario a cada fila sin depender de una FK a `profiles`.
 * En la base, columnas como `comentarios.user_id`, `subtareas.asignado_a`, `time_entries.user_id` o
 * `tarea_asignaciones.consultor_id` apuntan a `auth.users`, no a `profiles`, por lo que PostgREST no admite
 * `select('*, profiles:columna(...)')`. Se piden los perfiles aparte (una consulta) y se unen aquí.
 */
export async function conPerfiles<Row extends object, Key extends keyof Row & string>(
  rows: Row[],
  key: Key,
): Promise<(Row & { profiles: Pick<ConsultorResumen, 'nombre_completo'> | null })[]> {
  const ids = [...new Set(rows.map((row) => row[key]).filter((id): id is Row[Key] & string => typeof id === 'string'))];
  const { data: perfiles } = ids.length
    ? await supabase.from('profiles').select('id, nombre_completo').in('id', ids)
    : { data: [] as ConsultorResumen[] };
  return rows.map((row) => ({
    ...row,
    profiles: perfiles?.find((p) => p.id === row[key]) ?? null,
  }));
}
