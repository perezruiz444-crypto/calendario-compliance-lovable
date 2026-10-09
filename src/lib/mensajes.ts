import { supabase } from '@/integrations/supabase/client';
import type { MensajeConJoins } from '@/types/domain';

/**
 * `mensajes.remitente_id` y `destinatario_id` apuntan a `auth.users`, no a `profiles`, así que PostgREST
 * no admite el embed `profiles!mensajes_*_fkey`. Se piden los perfiles aparte y se unen aquí.
 */
export async function conRemitenteYDestinatario<Row extends { remitente_id: string; destinatario_id: string }>(
  rows: Row[],
): Promise<(Row & Pick<MensajeConJoins, 'remitente' | 'destinatario'>)[]> {
  const ids = [...new Set(rows.flatMap((r) => [r.remitente_id, r.destinatario_id]))];
  const { data: perfiles } = ids.length
    ? await supabase.from('profiles').select('id, nombre_completo').in('id', ids)
    : { data: [] };
  const nombre = (id: string) => {
    const p = perfiles?.find((x) => x.id === id);
    return p ? { nombre_completo: p.nombre_completo } : null;
  };
  return rows.map((r) => ({ ...r, remitente: nombre(r.remitente_id), destinatario: nombre(r.destinatario_id) }));
}
