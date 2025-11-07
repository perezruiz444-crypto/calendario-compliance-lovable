import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface AnalyticsData {
  // Common metrics
  totalTareas: number;
  tareasPendientes: number;
  tareasCompletadas: number;
  tareasVencidas: number;
  
  // Admin specific
  totalEmpresas?: number;
  totalUsuarios?: number;
  totalConsultores?: number;
  tareasPerformance?: Array<{ mes: string; completadas: number; pendientes: number }>;
  tareasPorConsultor?: Array<{ nombre: string; total: number; completadas: number }>;
  empresasActivas?: number;
  
  // Consultor specific
  misEmpresas?: number;
  tareasAsignadas?: number;
  performanceMensual?: Array<{ mes: string; completadas: number }>;
  tareasPorEstado?: Array<{ estado: string; cantidad: number }>;
  
  // Cliente specific
  documentosPorVencer?: number;
  solicitudesPendientes?: number;
  proximosVencimientos?: Array<{ tipo: string; fecha: string; dias: number }>;
  
  // Common
  documentosVencimiento?: Array<{ nombre: string; empresa: string; dias: number }>;
  actividadReciente?: Array<{ tipo: string; descripcion: string; fecha: string }>;
}

export function useAnalytics() {
  const { user, role } = useAuth();
  const [data, setData] = useState<AnalyticsData>({
    totalTareas: 0,
    tareasPendientes: 0,
    tareasCompletadas: 0,
    tareasVencidas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) {
      fetchAnalytics();
    }
  }, [user, role]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (role === 'administrador') {
        await fetchAdminAnalytics();
      } else if (role === 'consultor') {
        await fetchConsultorAnalytics();
      } else if (role === 'cliente') {
        await fetchClienteAnalytics();
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAnalytics = async () => {
    // Total empresas
    const { count: empresasCount } = await supabase
      .from('empresas')
      .select('*', { count: 'exact', head: true });

    // Total usuarios
    const { count: usuariosCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Total consultores
    const { count: consultoresCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'consultor');

    // Tareas
    const { data: tareas } = await supabase
      .from('tareas')
      .select('*');

    const today = new Date();
    const totalTareas = tareas?.length || 0;
    const tareasPendientes = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0;
    const tareasCompletadas = tareas?.filter(t => t.estado === 'completada').length || 0;
    const tareasVencidas = tareas?.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'completada') return false;
      return differenceInDays(new Date(t.fecha_vencimiento), today) < 0;
    }).length || 0;

    // Performance últimos 6 meses
    const tareasPerformance = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = subMonths(today, i);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      
      const completadas = tareas?.filter(t => {
        if (t.estado !== 'completada') return false;
        const updated = new Date(t.updated_at);
        return updated >= inicio && updated <= fin;
      }).length || 0;

      const pendientes = tareas?.filter(t => {
        if (t.estado === 'completada') return false;
        const created = new Date(t.created_at);
        return created >= inicio && created <= fin;
      }).length || 0;

      tareasPerformance.push({
        mes: fecha.toLocaleDateString('es', { month: 'short' }),
        completadas,
        pendientes
      });
    }

    // Tareas por consultor
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'consultor');
    
    const consultorIds = rolesData?.map(r => r.user_id) || [];
    
    let consultores = [];
    if (consultorIds.length > 0) {
      const { data: consultoresData } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', consultorIds);
      consultores = consultoresData || [];
    }

    const tareasPorConsultor = consultores.length > 0 ? await Promise.all(
      consultores.slice(0, 5).map(async (consultor) => {
        const { data: consultorTareas } = await supabase
          .from('tareas')
          .select('estado')
          .eq('consultor_asignado_id', consultor.id);

        return {
          nombre: consultor.nombre_completo,
          total: consultorTareas?.length || 0,
          completadas: consultorTareas?.filter(t => t.estado === 'completada').length || 0
        };
      })
    ) : [];

    // Documentos próximos a vencer
    const { data: documentos } = await supabase
      .from('documentos')
      .select(`
        nombre,
        fecha_vencimiento,
        empresas(razon_social)
      `)
      .not('fecha_vencimiento', 'is', null)
      .order('fecha_vencimiento', { ascending: true })
      .limit(5);

    const documentosVencimiento = documentos?.map(doc => ({
      nombre: doc.nombre,
      empresa: (doc.empresas as any)?.razon_social || 'N/A',
      dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
    })).filter(d => d.dias >= 0 && d.dias <= 90) || [];

    setData({
      totalTareas,
      tareasPendientes,
      tareasCompletadas,
      tareasVencidas,
      totalEmpresas: empresasCount || 0,
      totalUsuarios: usuariosCount || 0,
      totalConsultores: consultoresCount || 0,
      empresasActivas: empresasCount || 0,
      tareasPerformance,
      tareasPorConsultor: tareasPorConsultor.filter(t => t.total > 0),
      documentosVencimiento
    });
  };

  const fetchConsultorAnalytics = async () => {
    // Empresas asignadas
    const { data: asignaciones } = await supabase
      .from('consultor_empresa_asignacion')
      .select('empresa_id')
      .eq('consultor_id', user?.id);

    const misEmpresas = asignaciones?.length || 0;
    const empresaIds = asignaciones?.map(a => a.empresa_id) || [];

    // Tareas del consultor - handle empty empresaIds array
    let tareasQuery = supabase
      .from('tareas')
      .select('*');
    
    if (empresaIds.length > 0) {
      tareasQuery = tareasQuery.or(`consultor_asignado_id.eq.${user?.id},empresa_id.in.(${empresaIds.join(',')})`);
    } else {
      tareasQuery = tareasQuery.eq('consultor_asignado_id', user?.id);
    }
    
    const { data: tareas } = await tareasQuery;

    const today = new Date();
    const totalTareas = tareas?.length || 0;
    const tareasAsignadas = tareas?.filter(t => t.consultor_asignado_id === user?.id).length || 0;
    const tareasPendientes = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0;
    const tareasCompletadas = tareas?.filter(t => t.estado === 'completada').length || 0;
    const tareasVencidas = tareas?.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'completada') return false;
      return differenceInDays(new Date(t.fecha_vencimiento), today) < 0;
    }).length || 0;

    // Performance mensual últimos 6 meses
    const performanceMensual = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = subMonths(today, i);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      
      const completadas = tareas?.filter(t => {
        if (t.estado !== 'completada' || t.consultor_asignado_id !== user?.id) return false;
        const updated = new Date(t.updated_at);
        return updated >= inicio && updated <= fin;
      }).length || 0;

      performanceMensual.push({
        mes: fecha.toLocaleDateString('es', { month: 'short' }),
        completadas
      });
    }

    // Tareas por estado
    const estados = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
    const tareasPorEstado = estados.map(estado => ({
      estado: estado === 'en_progreso' ? 'En Progreso' : 
              estado.charAt(0).toUpperCase() + estado.slice(1),
      cantidad: tareas?.filter(t => t.estado === estado).length || 0
    })).filter(e => e.cantidad > 0);

    // Documentos próximos a vencer de mis empresas
    let documentos = [];
    if (empresaIds.length > 0) {
      const { data: docs } = await supabase
        .from('documentos')
        .select(`
          nombre,
          fecha_vencimiento,
          empresas(razon_social)
        `)
        .in('empresa_id', empresaIds)
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true })
        .limit(5);
      documentos = docs || [];
    }

    const documentosVencimiento = documentos?.map(doc => ({
      nombre: doc.nombre,
      empresa: (doc.empresas as any)?.razon_social || 'N/A',
      dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
    })).filter(d => d.dias >= 0 && d.dias <= 90) || [];

    setData({
      totalTareas,
      tareasPendientes,
      tareasCompletadas,
      tareasVencidas,
      misEmpresas,
      tareasAsignadas,
      performanceMensual,
      tareasPorEstado,
      documentosVencimiento
    });
  };

  const fetchClienteAnalytics = async () => {
    // Get cliente's empresa
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.empresa_id) {
      setData({
        totalTareas: 0,
        tareasPendientes: 0,
        tareasCompletadas: 0,
        tareasVencidas: 0
      });
      return;
    }

    // Tareas de la empresa
    const { data: tareas } = await supabase
      .from('tareas')
      .select('*')
      .eq('empresa_id', profile.empresa_id);

    const today = new Date();
    const totalTareas = tareas?.length || 0;
    const tareasPendientes = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0;
    const tareasCompletadas = tareas?.filter(t => t.estado === 'completada').length || 0;
    const tareasVencidas = tareas?.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'completada') return false;
      return differenceInDays(new Date(t.fecha_vencimiento), today) < 0;
    }).length || 0;

    // Documentos por vencer
    const { data: documentos } = await supabase
      .from('documentos')
      .select('*')
      .eq('empresa_id', profile.empresa_id)
      .not('fecha_vencimiento', 'is', null);

    const documentosPorVencer = documentos?.filter(doc => {
      const dias = differenceInDays(new Date(doc.fecha_vencimiento!), today);
      return dias >= 0 && dias <= 30;
    }).length || 0;

    // Solicitudes pendientes
    const { count: solicitudesPendientes } = await supabase
      .from('solicitudes_servicio')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', profile.empresa_id)
      .eq('estado', 'pendiente');

    // Próximos vencimientos
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', profile.empresa_id)
      .single();

    const proximosVencimientos = [];
    if (empresa?.cert_iva_ieps_fecha_vencimiento) {
      const dias = differenceInDays(new Date(empresa.cert_iva_ieps_fecha_vencimiento), today);
      if (dias >= 0 && dias <= 90) {
        proximosVencimientos.push({
          tipo: 'Certificación IVA/IEPS',
          fecha: empresa.cert_iva_ieps_fecha_vencimiento,
          dias
        });
      }
    }
    if (empresa?.matriz_seguridad_fecha_vencimiento) {
      const dias = differenceInDays(new Date(empresa.matriz_seguridad_fecha_vencimiento), today);
      if (dias >= 0 && dias <= 90) {
        proximosVencimientos.push({
          tipo: 'Matriz de Seguridad',
          fecha: empresa.matriz_seguridad_fecha_vencimiento,
          dias
        });
      }
    }
    if (empresa?.immex_fecha_fin) {
      const dias = differenceInDays(new Date(empresa.immex_fecha_fin), today);
      if (dias >= 0 && dias <= 90) {
        proximosVencimientos.push({
          tipo: 'Programa IMMEX',
          fecha: empresa.immex_fecha_fin,
          dias
        });
      }
    }

    const documentosVencimiento = documentos?.map(doc => ({
      nombre: doc.nombre,
      empresa: empresa?.razon_social || 'N/A',
      dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
    })).filter(d => d.dias >= 0 && d.dias <= 90).slice(0, 5) || [];

    setData({
      totalTareas,
      tareasPendientes,
      tareasCompletadas,
      tareasVencidas,
      documentosPorVencer,
      solicitudesPendientes: solicitudesPendientes || 0,
      proximosVencimientos,
      documentosVencimiento
    });
  };

  return { data, loading, refetch: fetchAnalytics };
}
