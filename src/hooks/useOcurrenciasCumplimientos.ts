/**
 * Fase 2 — Hook del modelo de ocurrencias.
 *
 * Reemplaza la lógica virtual de `useObligacionCumplimientos` (que calculaba el
 * "próximo período" en runtime). Aquí las ocurrencias son FILAS REALES de
 * `obligacion_ocurrencias`, y el cumplimiento se registra contra `ocurrencia_id`.
 *
 * Append-only: marcar = INSERT; desmarcar/corregir = RPC `corregir_cumplimiento`
 * (nunca DELETE/UPDATE directo — la RLS los bloquea).
 *
 * Convive con el hook viejo hasta que todos los consumidores migren.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import type { OcurrenciaConObligacion } from '@/types/domain';

export function useOcurrenciasCumplimientos(empresaId: string | null) {
  const { user } = useAuth();
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConObligacion[]>([]);
  // Mapa ocurrencia_id -> completada (cumplimiento vigente)
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!empresaId) {
      setOcurrencias([]);
      setCumplimientos({});
      setLoading(false);
      return;
    }
    setLoading(true);

    // Ocurrencias de la empresa con su obligación
    const { data: ocData, error: ocErr } = await supabase
      .from('obligacion_ocurrencias')
      .select('*, obligaciones(id, nombre, categoria, presentacion, descripcion, empresas(razon_social))')
      .eq('empresa_id', empresaId)
      .order('fecha_vencimiento', { ascending: true });

    if (ocErr) {
      logger.error('Error al cargar ocurrencias', ocErr);
      toast.error('No se pudieron cargar las obligaciones.');
      setLoading(false);
      return;
    }

    const ocs = (ocData || []) as unknown as OcurrenciaConObligacion[];
    setOcurrencias(ocs);

    // Cumplimientos vigentes ligados a esas ocurrencias
    if (ocs.length > 0) {
      const ocIds = ocs.map((o) => o.id);
      const { data: cData } = await supabase
        .from('obligacion_cumplimientos')
        .select('ocurrencia_id, completada, vigente')
        .eq('empresa_id', empresaId)
        .in('ocurrencia_id', ocIds);

      const map: Record<string, boolean> = {};
      (cData || []).forEach((c: any) => {
        if (c.vigente && c.ocurrencia_id) map[c.ocurrencia_id] = c.completada;
      });
      setCumplimientos(map);
    } else {
      setCumplimientos({});
    }
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Realtime: cambios en cumplimientos de la empresa
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`ocurrencias-cumpl-${empresaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obligacion_cumplimientos', filter: `empresa_id=eq.${empresaId}` },
        () => fetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetch]);

  /** Marca o corrige el cumplimiento de una ocurrencia (append-only). */
  const toggleCumplimiento = async (ocurrencia: OcurrenciaConObligacion) => {
    if (!user || !empresaId) return;
    const wasComplete = !!cumplimientos[ocurrencia.id];

    // Optimista
    setCumplimientos((prev) => ({ ...prev, [ocurrencia.id]: !wasComplete }));
    setToggling(ocurrencia.id);

    try {
      // ¿Existe ya un cumplimiento vigente para esta ocurrencia?
      const { data: existing } = await supabase
        .from('obligacion_cumplimientos')
        .select('id')
        .eq('ocurrencia_id', ocurrencia.id)
        .eq('vigente', true)
        .maybeSingle();

      if (existing?.id) {
        // Corrección append-only vía RPC (invierte el estado)
        const { error } = await supabase.rpc('corregir_cumplimiento', {
          p_cumplimiento_id: existing.id,
          p_completada: !wasComplete,
          p_notas: null,
        });
        if (error) throw error;
      } else {
        // Primer cumplimiento: INSERT
        const { error } = await supabase.from('obligacion_cumplimientos').insert({
          obligacion_id: ocurrencia.obligacion_id,
          ocurrencia_id: ocurrencia.id,
          empresa_id: empresaId,
          periodo_key: ocurrencia.periodo_key,
          completada: !wasComplete,
          completada_por: user.id,
        });
        if (error) throw error;
      }
      toast.success(wasComplete ? 'Cumplimiento desmarcado' : 'Cumplimiento marcado');
    } catch (error) {
      logger.error('Error al actualizar el cumplimiento', error);
      setCumplimientos((prev) => ({ ...prev, [ocurrencia.id]: wasComplete }));
      toast.error('No tienes permiso o hubo un error al actualizar');
    } finally {
      setToggling(null);
    }
  };

  return { ocurrencias, cumplimientos, toggleCumplimiento, toggling, loading, refetch: fetch };
}
