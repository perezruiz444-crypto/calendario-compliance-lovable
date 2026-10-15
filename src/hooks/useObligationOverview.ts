import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { loadAllPages } from '@/lib/pagination';
import { buildOverviewData } from '@/lib/obligationOverviewData';
import type { OverviewDatabase } from '@/types/obligationOverviewDatabase';

/** Solo extiende el contrato tipado del mismo cliente autenticado; no usa service role. */
const client = supabase as SupabaseClient<OverviewDatabase>;
export { client as obligationOverviewClient };

function missingTable(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}
async function optionalRows<T>(read: () => Promise<T[]>) {
  try { return { rows: await read(), available: true }; }
  catch (error) {
    if (!missingTable(error)) throw error;
    // Compatibilidad con migración aún no aplicada, no con red rota o permiso denegado.
    return { rows: [] as T[], available: false };
  }
}

export function useObligationOverview(empresaId: string | null) {
  const { user, actualRole } = useAuth();
  return useQuery({
    queryKey: ['obligation-overview', user?.id, actualRole, empresaId],
    enabled: !!user && !!actualRole && !!empresaId,
    retry: false,
    queryFn: async () => {
      if (!user || !empresaId || !actualRole) throw new Error('Sesión no disponible');
      if (actualRole === 'cliente') {
        const { data, error } = await supabase.from('profiles').select('empresa_id').eq('id', user.id).maybeSingle();
        if (error) throw error;
        if (data?.empresa_id !== empresaId) throw new Error('No tienes acceso a esta empresa');
      } else if (actualRole === 'consultor') {
        const { data, error } = await supabase.from('consultor_empresa_asignacion').select('empresa_id').eq('consultor_id', user.id).eq('empresa_id', empresaId);
        if (error) throw error;
        if (!data?.length) throw new Error('No tienes acceso a esta empresa');
      }
      const { data: empresa, error: empresaError } = await supabase.from('empresas').select('*').eq('id', empresaId).maybeSingle();
      if (empresaError) throw empresaError;
      if (!empresa) throw new Error('No se encontró la empresa');
      const [obligaciones, ocurrencias, cumplimientos, documentos, tareas, asignaciones] = await Promise.all([
        loadAllPages((offset, size) => supabase.from('obligaciones').select('*').eq('empresa_id', empresaId).eq('activa', true).order('id').range(offset, offset + size - 1)),
        loadAllPages((offset, size) => client.from('obligacion_ocurrencias').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1)),
        loadAllPages((offset, size) => client.from('obligacion_cumplimientos').select('*').eq('empresa_id', empresaId).eq('vigente', true).order('id').range(offset, offset + size - 1)),
        loadAllPages((offset, size) => supabase.from('documentos').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1)),
        loadAllPages((offset, size) => supabase.from('tareas').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1)),
        loadAllPages((offset, size) => supabase.from('obligacion_responsables').select('id, obligacion_id').eq('user_id', user.id).order('id').range(offset, offset + size - 1)),
      ]);
      const [reglas, revisiones, eventos, relaciones] = await Promise.all([
        optionalRows(() => loadAllPages((offset, size) => client.from('obligacion_reglas').select('*').order('id').range(offset, offset + size - 1))),
        optionalRows(() => loadAllPages((offset, size) => client.from('obligacion_revisiones').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1))),
        optionalRows(() => loadAllPages((offset, size) => client.from('obligacion_eventos').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1))),
        optionalRows(() => loadAllPages((offset, size) => client.from('obligacion_relaciones').select('*').eq('empresa_id', empresaId).order('id').range(offset, offset + size - 1))),
      ]);
      const metadataReady = [reglas, revisiones, eventos, relaciones].every(result => result.available);
      const responsables = [...new Set(obligaciones.map(o => o.responsable_id).filter((id): id is string => !!id))];
      const perfiles: { id: string; nombre_completo: string }[] = [];
      for (let start = 0; start < responsables.length; start += 100) {
        const ids = responsables.slice(start, start + 100);
        const rows = await loadAllPages((offset, size) => supabase.from('profiles').select('id,nombre_completo').in('id', ids).order('id').range(offset, offset + size - 1));
        perfiles.push(...rows);
      }
      return buildOverviewData({ empresa, obligaciones, ocurrencias, cumplimientos, documentos, tareas,
        reglas: metadataReady ? reglas.rows : [], revisiones: metadataReady ? revisiones.rows : [], eventos: metadataReady ? eventos.rows : [], relaciones: metadataReady ? relaciones.rows : [],
        asignaciones: [...asignaciones.map(a => a.obligacion_id),...obligaciones.filter(o=>o.responsable_id===user.id).map(o=>o.id)], perfiles, metadataReady });
    },
  });
}
