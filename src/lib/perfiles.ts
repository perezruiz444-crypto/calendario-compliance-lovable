import { supabase } from '@/integrations/supabase/client';
import type { ConsultorResumen } from '@/types/domain';

/**
 * Nombres de otros usuarios vía la RPC `nombres_perfiles`, que devuelve solo id + nombre_completo.
 * Leer `profiles` directo no sirve: su RLS oculta al staff (un cliente no ve a su consultor, un consultor
 * no ve al admin) y ampliarla expondría email y teléfono. Los ids que el usuario no puede ver no vuelven.
 */
export async function nombresPerfiles(ids: readonly string[]): Promise<ConsultorResumen[]> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return [];
  const { data } = await supabase.rpc('nombres_perfiles', { ids: unicos });
  return data ?? [];
}

/**
 * Une el nombre del usuario a cada fila sin depender de una FK a `profiles`.
 * En la base, columnas como `comentarios.user_id`, `subtareas.asignado_a`, `time_entries.user_id` o
 * `tarea_asignaciones.consultor_id` apuntan a `auth.users`, no a `profiles`, por lo que PostgREST no admite
 * `select('*, profiles:columna(...)')`. Se piden los nombres aparte (una consulta) y se unen aquí.
 */
export async function conPerfiles<Row extends object, Key extends keyof Row & string>(
  rows: Row[],
  key: Key,
): Promise<(Row & { profiles: Pick<ConsultorResumen, 'nombre_completo'> | null })[]> {
  const ids = rows.map((row) => row[key]).filter((id): id is Row[Key] & string => typeof id === 'string');
  const perfiles = await nombresPerfiles(ids);
  return rows.map((row) => ({
    ...row,
    profiles: perfiles.find((p) => p.id === row[key]) ?? null,
  }));
}
