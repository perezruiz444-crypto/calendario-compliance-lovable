import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchCumplimientoKeys } from '@/lib/obligaciones';
import type {
  Empresa, Obligacion, TareaConJoins,
  DomicilioOperacion, AgenteAduanal, ApoderadoLegal,
} from '@/types/domain';

/**
 * Hook que centraliza el fetching de datos de la página EmpresaDetail.
 * Devuelve: empresa, tareas, obligaciones, cumplimientoKeys, contactos,
 * y métodos refetch para refrescar después de mutations.
 */
export function useEmpresaDetailData(empresaId: string | undefined, onNotFound?: () => void) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [tareas, setTareas] = useState<TareaConJoins[]>([]);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [cumplimientoKeys, setCumplimientoKeys] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  // Datos de contactos (lazy)
  const [domicilios, setDomicilios] = useState<DomicilioOperacion[]>([]);
  const [agentes, setAgentes] = useState<AgenteAduanal[]>([]);
  const [apoderados, setApoderados] = useState<ApoderadoLegal[]>([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [hasFetchedContactos, setHasFetchedContactos] = useState(false);

  // Ref para evitar que el callback externo invalide el useCallback y cause loops infinitos
  const onNotFoundRef = useRef(onNotFound);
  useEffect(() => { onNotFoundRef.current = onNotFound; }, [onNotFound]);

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
        onNotFoundRef.current?.();
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

      // El tipo inferido por Supabase para los joins (profiles, categorias_tareas)
      // no se solapa estructuralmente con TareaConJoins, por lo que el cast directo
      // falla bajo noImplicitAny. Cast vía unknown: la forma en runtime sí coincide.
      setTareas((tarRes.data || []) as unknown as TareaConJoins[]);
      setObligaciones(obsRes.data || []);

      const obsIds = (obsRes.data || []).map(o => o.id);
      setCumplimientoKeys(await fetchCumplimientoKeys(supabase, obsIds));
    } catch (e) {
      toast.error('Error al cargar la empresa');
    } finally {
      setLoadingData(false);
    }
  }, [empresaId]);

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
