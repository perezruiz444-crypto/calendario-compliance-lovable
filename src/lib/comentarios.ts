import { supabase } from '@/integrations/supabase/client';
import { conPerfiles } from '@/lib/perfiles';
import type { Comentario } from '@/types/domain';

/**
 * Comentarios de una tarea con el nombre de quien comentó.
 * `comentarios` solo tiene FK a `tareas` (no a `profiles`): ver `conPerfiles`.
 */
export async function fetchComentariosConPerfiles(tareaId: string): Promise<Comentario[]> {
  const { data: comentarios, error } = await supabase
    .from('comentarios')
    .select('*')
    .eq('tarea_id', tareaId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!comentarios || comentarios.length === 0) return [];

  return conPerfiles(comentarios, 'user_id');
}
