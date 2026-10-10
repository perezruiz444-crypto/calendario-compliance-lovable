import { nombresPerfiles } from '@/lib/perfiles';
import type { MensajeConJoins } from '@/types/domain';

/**
 * `mensajes.remitente_id` y `destinatario_id` apuntan a `auth.users`, no a `profiles`, así que PostgREST
 * no admite el embed `profiles!mensajes_*_fkey`. Se piden los nombres aparte y se unen aquí.
 */
export async function conRemitenteYDestinatario<Row extends { remitente_id: string; destinatario_id: string }>(
  rows: Row[],
): Promise<(Row & Pick<MensajeConJoins, 'remitente' | 'destinatario'>)[]> {
  const perfiles = await nombresPerfiles(rows.flatMap((r) => [r.remitente_id, r.destinatario_id]));
  const nombre = (id: string) => {
    const p = perfiles.find((x) => x.id === id);
    return p ? { nombre_completo: p.nombre_completo } : null;
  };
  return rows.map((r) => ({ ...r, remitente: nombre(r.remitente_id), destinatario: nombre(r.destinatario_id) }));
}
