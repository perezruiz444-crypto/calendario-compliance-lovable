/**
 * Hook para gestionar el estado, actualización optimista y realtime
 * de los cumplimientos de obligaciones.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPeriodKey } from '@/lib/obligaciones';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface Obligacion {
  id: string;
  presentacion: string | null;
  [key: string]: any;
}

export function useObligacionCumplimientos(obligaciones: Obligacion[], empresaId: string | null) {
  const { user } = useAuth();
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchCumplimientos = useCallback(async () => {
    if (!empresaId || obligaciones.length === 0) {
      setCumplimientos({});
      return;
    }

    const oblIds = obligaciones.map((o) => o.id);

    const { data } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key, completada')
      .eq('empresa_id', empresaId)
      .in('obligacion_id', oblIds);

    const map: Record<string, boolean> = {};
    (data || []).forEach((c: any) => {
      const obl = obligaciones.find((o) => o.id === c.obligacion_id);
      if (obl && c.periodo_key === getCurrentPeriodKey(obl.presentacion)) {
        map[c.obligacion_id] = c.completada;
      }
    });
    setCumplimientos(map);
  }, [empresaId, obligaciones]);

  // Fetch inicial y al cambiar obligaciones/empresa
  useEffect(() => {
    fetchCumplimientos();
  }, [fetchCumplimientos]);

  // Suscripción Realtime optimizada (filtra por empresa_id)
  useEffect(() => {
    if (!empresaId) return;

    const channel = supabase
      .channel(`cumplimientos-empresa-${empresaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'obligacion_cumplimientos',
          filter: `empresa_id=eq.${empresaId}`,
        },
        () => {
          fetchCumplimientos();
        }
      )
      .subscribe();

    // Cleanup explícito para evitar memory leaks al cambiar de empresa
    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, fetchCumplimientos]);

  const toggleCumplimiento = async (obl: Obligacion) => {
    if (!user || !empresaId) return;

    const periodKey = getCurrentPeriodKey(obl.presentacion);
    const wasComplete = !!cumplimientos[obl.id];

    // Optimistic update
    setCumplimientos((prev) => ({ ...prev, [obl.id]: !wasComplete }));
    setToggling(obl.id);

    try {
      if (wasComplete) {
        const { error } = await supabase
          .from('obligacion_cumplimientos')
          .delete()
          .eq('obligacion_id', obl.id)
          .eq('periodo_key', periodKey);

        if (error) throw error;
        toast.success('Cumplimiento desmarcado');
      } else {
        const { error } = await supabase
          .from('obligacion_cumplimientos')
          .insert({
            obligacion_id: obl.id,
            empresa_id: empresaId, // <- Ahora se guarda con el empresa_id
            periodo_key: periodKey,
            completada: true,
            completada_por: user.id,
          });

        if (error) throw error;
        toast.success('Cumplimiento marcado');
      }
    } catch (error) {
      logger.error('Error al actualizar el cumplimiento', error);
      // Revert on failure
      setCumplimientos((prev) => ({ ...prev, [obl.id]: wasComplete }));
      toast.error('No tienes permiso o hubo un error al actualizar');
    } finally {
      setToggling(null);
    }
  };

  return { cumplimientos, toggleCumplimiento, toggling, refetch: fetchCumplimientos };
}