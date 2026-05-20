import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook que centraliza el fetching de datos de la página EmpresaDetail.
 * Devuelve: empresa, tareas, obligaciones, cumplimientoKeys, contactos,
 * y métodos refetch para refrescar después de mutations.
 */
export function useEmpresaDetailData(empresaId: string | undefined, onNotFound?: () => void) {
  const [empresa, setEmpresa] = useState<any>(null);
  const [tareas, setTareas] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientoKeys, setCumplimientoKeys] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  // Datos de contactos (lazy)
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [hasFetchedContactos, setHasFetchedContactos] = useState(false);

  const fetchEmpresaData = useCallback(async () => {
    if (!empresaId) return;
    setLoadingData(true);
    try {
      const { data: empresaData, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresaId)
        .maybeSingle();
      if (error) throw error;
      if (!empresaData) {
        toast.error('Empresa no encontrada');
        onNotFound?.();
        return;
      }
      setEmpresa(empresaData);

      const [tarRes, obsRes] = await Promise.all([
        supabase
          .from('tareas')
          .select('*, profiles:consultor_asignado_id(nombre_completo), categorias_tareas(nombre, color)')
          .eq('empresa_id', empresaId)
          .order('fecha_vencimiento', { ascending: true })
          .limit(10),
        supabase
          .from('obligaciones')
          .select('*')
          .eq('empresa_id', empresaId)
          .eq('activa', true)
          .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      ]);

      setTareas(tarRes.data || []);
      setObligaciones(obsRes.data || []);

      const obsIds = (obsRes.data || []).map((o: any) => o.id);
      if (obsIds.length > 0) {
        const { data: cumplData } = await supabase
          .from('obligacion_cumplimientos')
          .select('obligacion_id, periodo_key')
          .in('obligacion_id', obsIds);
        setCumplimientoKeys(new Set((cumplData || []).map(c => `${c.obligacion_id}:${c.periodo_key}`)));
      } else {
        setCumplimientoKeys(new Set());
      }
    } catch (e) {
      toast.error('Error al cargar la empresa');
    } finally {
      setLoadingData(false);
    }
  }, [empresaId, onNotFound]);

  const fetchContactosData = useCallback(async () => {
    if (!empresaId || hasFetchedContactos) return;
    setLoadingContactos(true);
    try {
      const [domRes, agRes, apRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', empresaId),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', empresaId),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', empresaId),
      ]);
      setDomicilios(domRes.data || []);
      setAgentes(agRes.data || []);
      setApoderados(apRes.data || []);
      setHasFetchedContactos(true);
    } catch {
      toast.error('Error al cargar contactos');
    } finally {
      setLoadingContactos(false);
    }
  }, [empresaId, hasFetchedContactos]);

  useEffect(() => { fetchEmpresaData(); }, [fetchEmpresaData]);

  return {
    empresa,
    setEmpresa,
    tareas,
    obligaciones,
    cumplimientoKeys,
    loadingData,
    domicilios,
    agentes,
    apoderados,
    loadingContactos,
    fetchEmpresaData,
    fetchContactosData,
  };
}
