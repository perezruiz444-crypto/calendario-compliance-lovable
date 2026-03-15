import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getCurrentPeriodKey } from '@/lib/obligaciones';

export interface ProximaTarea {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fecha_vencimiento: string;
  empresa_nombre: string;
}

export interface MensajeNoLeido {
  id: string;
  asunto: string;
  remitente_nombre: string;
  created_at: string;
}

export interface AnalyticsData {
  // Common metrics
  totalTareas: number;
  tareasPendientes: number;
  tareasCompletadas: number;
  tareasVencidas: number;
  nombreUsuario: string;
  mensajesNoLeidos: number;
  mensajesRecientes: MensajeNoLeido[];
  proximasTareas: ProximaTarea[];
  
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
  empresaCliente?: any;
  
  // Common
  documentosVencimiento?: Array<{ nombre: string; empresa: string; dias: number }>;
  actividadReciente?: Array<{ tipo: string; descripcion: string; fecha: string }>;
  
  // Obligaciones
  obligacionesPendientes?: number;
  obligacionesActivas?: number;
}

const DEFAULT_DATA: AnalyticsData = {
  totalTareas: 0,
  tareasPendientes: 0,
  tareasCompletadas: 0,
  tareasVencidas: 0,
  nombreUsuario: '',
  mensajesNoLeidos: 0,
  mensajesRecientes: [],
  proximasTareas: [],
};

export function useAnalytics(empresaId?: string | null) {
  const { user, role } = useAuth();
  const [data, setData] = useState<AnalyticsData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) {
      fetchAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, empresaId]);

  const fetchCommonData = async () => {
    // Profile name
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre_completo, empresa_id')
      .eq('id', user?.id)
      .maybeSingle();

    // Unread messages count + recent
    const { data: mensajes, count: mensajesCount } = await supabase
      .from('mensajes')
      .select('id, asunto, remitente_id, created_at', { count: 'exact' })
      .eq('destinatario_id', user?.id)
      .eq('leido', false)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get sender names
    let mensajesRecientes: MensajeNoLeido[] = [];
    if (mensajes && mensajes.length > 0) {
      const senderIds = [...new Set(mensajes.map(m => m.remitente_id))];
      const { data: senders } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', senderIds);
      const senderMap = senders?.reduce((acc, s) => { acc[s.id] = s.nombre_completo; return acc; }, {} as Record<string, string>) || {};
      
      mensajesRecientes = mensajes.map(m => ({
        id: m.id,
        asunto: m.asunto,
        remitente_nombre: senderMap[m.remitente_id] || 'Desconocido',
        created_at: m.created_at || '',
      }));
    }

    return {
      nombreUsuario: profile?.nombre_completo || '',
      empresa_id: profile?.empresa_id,
      mensajesNoLeidos: mensajesCount || 0,
      mensajesRecientes,
    };
  };

  const fetchProximasTareas = async (tareas: any[]) => {
    const today = new Date();
    const proximas = tareas
      .filter(t => {
        if (!t.fecha_vencimiento || t.estado === 'completada' || t.estado === 'cancelada') return false;
        return differenceInDays(new Date(t.fecha_vencimiento), today) >= 0;
      })
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
      .slice(0, 10);

    if (proximas.length === 0) return [];

    const empresaIds = [...new Set(proximas.map(t => t.empresa_id))];
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razon_social')
      .in('id', empresaIds);
    const empMap = empresas?.reduce((acc, e) => { acc[e.id] = e.razon_social; return acc; }, {} as Record<string, string>) || {};

    return proximas.map(t => ({
      id: t.id,
      titulo: t.titulo,
      estado: t.estado,
      prioridad: t.prioridad || 'media',
      fecha_vencimiento: t.fecha_vencimiento,
      empresa_nombre: empMap[t.empresa_id] || 'N/A',
    }));
  };

  const fetchObligacionesPendientes = async (empresaFilter?: string | string[]) => {
    let obQuery = supabase.from('obligaciones').select('id, nombre, presentacion, fecha_vencimiento, empresa_id').eq('activa', true);
    if (typeof empresaFilter === 'string') {
      obQuery = obQuery.eq('empresa_id', empresaFilter);
    } else if (Array.isArray(empresaFilter) && empresaFilter.length > 0) {
      obQuery = obQuery.in('empresa_id', empresaFilter);
    }
    const { data: obligaciones } = await obQuery;
    if (!obligaciones || obligaciones.length === 0) return { activas: 0, pendientes: 0, proximasOb: [] as ProximaTarea[] };

    const obIds = obligaciones.map(o => o.id);
    const { data: cumplimientos } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key')
      .in('obligacion_id', obIds)
      .eq('completada', true);

    const cumplSet = new Set((cumplimientos || []).map(c => `${c.obligacion_id}:${c.periodo_key}`));
    
    const today = new Date();
    let pendientes = 0;
    const proximasOb: ProximaTarea[] = [];

    // Get empresa names for display
    const obEmpresaIds = [...new Set(obligaciones.map(o => o.empresa_id))];
    const { data: empNames } = await supabase.from('empresas').select('id, razon_social').in('id', obEmpresaIds);
    const empMap = empNames?.reduce((acc, e) => { acc[e.id] = e.razon_social; return acc; }, {} as Record<string, string>) || {};

    for (const ob of obligaciones) {
      const pk = getCurrentPeriodKey(ob.presentacion);
      const isCumplida = cumplSet.has(`${ob.id}:${pk}`);
      if (!isCumplida) {
        pendientes++;
        if (ob.fecha_vencimiento) {
          const dias = differenceInDays(new Date(ob.fecha_vencimiento), today);
          if (dias >= 0) {
            proximasOb.push({
              id: ob.id,
              titulo: `[Obligación] ${ob.nombre}`,
              estado: 'pendiente',
              prioridad: dias <= 7 ? 'alta' : dias <= 30 ? 'media' : 'baja',
              fecha_vencimiento: ob.fecha_vencimiento,
              empresa_nombre: empMap[ob.empresa_id] || 'N/A',
            });
          }
        }
      }
    }

    return { activas: obligaciones.length, pendientes, proximasOb };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const common = await fetchCommonData();

      if (role === 'administrador') {
        await fetchAdminAnalytics(common);
      } else if (role === 'consultor') {
        await fetchConsultorAnalytics(common);
      } else if (role === 'cliente') {
        await fetchClienteAnalytics(common);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAnalytics = async (common: Awaited<ReturnType<typeof fetchCommonData>>) => {
    const [empresasRes, usuariosRes, consultoresRes, tareasRes] = await Promise.all([
      supabase.from('empresas').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'consultor'),
      empresaId && empresaId !== 'all'
        ? supabase.from('tareas').select('*').eq('empresa_id', empresaId)
        : supabase.from('tareas').select('*'),
    ]);

    const tareas = tareasRes.data || [];
    const today = new Date();
    const totalTareas = tareas.length;
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length;
    const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length;
    const tareasVencidas = tareas.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'completada') return false;
      return differenceInDays(new Date(t.fecha_vencimiento), today) < 0;
    }).length;

    // Performance últimos 6 meses
    const tareasPerformance = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = subMonths(today, i);
      const inicio = startOfMonth(fecha);
      const fin = endOfMonth(fecha);
      
      const completadas = tareas.filter(t => {
        if (t.estado !== 'completada') return false;
        const updated = new Date(t.updated_at);
        return updated >= inicio && updated <= fin;
      }).length;

      const pendientes = tareas.filter(t => {
        if (t.estado === 'completada') return false;
        const created = new Date(t.created_at);
        return created >= inicio && created <= fin;
      }).length;

      tareasPerformance.push({
        mes: fecha.toLocaleDateString('es', { month: 'short' }),
        completadas,
        pendientes
      });
    }

    // Tareas por consultor
    const { data: rolesData } = await supabase.from('user_roles').select('user_id').eq('role', 'consultor');
    const consultorIds = rolesData?.map(r => r.user_id) || [];
    
    let tareasPorConsultor: Array<{ nombre: string; total: number; completadas: number }> = [];
    if (consultorIds.length > 0) {
      const { data: consultoresData } = await supabase.from('profiles').select('id, nombre_completo').in('id', consultorIds);
      const consultores = consultoresData || [];
      
      tareasPorConsultor = consultores.slice(0, 5).map(consultor => ({
        nombre: consultor.nombre_completo,
        total: tareas.filter(t => t.consultor_asignado_id === consultor.id).length,
        completadas: tareas.filter(t => t.consultor_asignado_id === consultor.id && t.estado === 'completada').length,
      })).filter(t => t.total > 0);
    }

    // Documentos próximos a vencer
    const { data: documentos } = await supabase
      .from('documentos')
      .select('nombre, fecha_vencimiento, empresas(razon_social)')
      .not('fecha_vencimiento', 'is', null)
      .order('fecha_vencimiento', { ascending: true })
      .limit(5);

    const documentosVencimiento = documentos?.map(doc => ({
      nombre: doc.nombre,
      empresa: (doc.empresas as any)?.razon_social || 'N/A',
      dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
    })).filter(d => d.dias >= 0 && d.dias <= 90) || [];

    const proximasTareas = await fetchProximasTareas(tareas);

    // Fetch obligaciones pendientes
    const obFilter = empresaId && empresaId !== 'all' ? empresaId : undefined;
    const obData = await fetchObligacionesPendientes(obFilter);
    const allProximas = [...proximasTareas, ...obData.proximasOb]
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
      .slice(0, 10);

    setData({
      ...DEFAULT_DATA,
      ...common,
      totalTareas: totalTareas + obData.activas,
      tareasPendientes: tareasPendientes + obData.pendientes,
      tareasCompletadas,
      tareasVencidas,
      totalEmpresas: empresasRes.count || 0,
      totalUsuarios: usuariosRes.count || 0,
      totalConsultores: consultoresRes.count || 0,
      empresasActivas: empresasRes.count || 0,
      tareasPerformance,
      tareasPorConsultor,
      documentosVencimiento,
      proximasTareas: allProximas,
      obligacionesPendientes: obData.pendientes,
      obligacionesActivas: obData.activas,
    });
  };

  const fetchConsultorAnalytics = async (common: Awaited<ReturnType<typeof fetchCommonData>>) => {
    const { data: asignaciones } = await supabase
      .from('consultor_empresa_asignacion')
      .select('empresa_id')
      .eq('consultor_id', user?.id);

    const misEmpresas = asignaciones?.length || 0;
    const empresaIds = asignaciones?.map(a => a.empresa_id) || [];

    let tareasQuery = supabase.from('tareas').select('*');
    if (empresaId && empresaId !== 'all') {
      tareasQuery = tareasQuery.eq('empresa_id', empresaId);
    } else if (empresaIds.length > 0) {
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
      performanceMensual.push({ mes: fecha.toLocaleDateString('es', { month: 'short' }), completadas });
    }

    const estados = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
    const tareasPorEstado = estados.map(estado => ({
      estado: estado === 'en_progreso' ? 'En Progreso' : estado.charAt(0).toUpperCase() + estado.slice(1),
      cantidad: tareas?.filter(t => t.estado === estado).length || 0
    })).filter(e => e.cantidad > 0);

    let documentosVencimiento: Array<{ nombre: string; empresa: string; dias: number }> = [];
    if (empresaIds.length > 0) {
      const { data: docs } = await supabase
        .from('documentos')
        .select('nombre, fecha_vencimiento, empresas(razon_social)')
        .in('empresa_id', empresaIds)
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true })
        .limit(5);
      documentosVencimiento = (docs || []).map(doc => ({
        nombre: doc.nombre,
        empresa: (doc.empresas as any)?.razon_social || 'N/A',
        dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
      })).filter(d => d.dias >= 0 && d.dias <= 90);
    }

    const proximasTareas = await fetchProximasTareas(tareas || []);

    // Fetch obligaciones pendientes
    const obFilter = empresaId && empresaId !== 'all' ? empresaId : (empresaIds.length > 0 ? empresaIds : undefined);
    const obData = await fetchObligacionesPendientes(obFilter);
    const allProximas = [...proximasTareas, ...obData.proximasOb]
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
      .slice(0, 10);

    setData({
      ...DEFAULT_DATA,
      ...common,
      totalTareas: totalTareas + obData.activas,
      tareasPendientes: tareasPendientes + obData.pendientes,
      tareasCompletadas,
      tareasVencidas,
      misEmpresas,
      tareasAsignadas,
      performanceMensual,
      tareasPorEstado,
      documentosVencimiento,
      proximasTareas: allProximas,
      obligacionesPendientes: obData.pendientes,
      obligacionesActivas: obData.activas,
    });
  };

  const fetchClienteAnalytics = async (common: Awaited<ReturnType<typeof fetchCommonData>>) => {
    if (!common.empresa_id) {
      setData({ ...DEFAULT_DATA, ...common });
      return;
    }

    const [tareasRes, docsRes, solicitudesRes, empresaRes] = await Promise.all([
      supabase.from('tareas').select('*').eq('empresa_id', common.empresa_id),
      supabase.from('documentos').select('*').eq('empresa_id', common.empresa_id).not('fecha_vencimiento', 'is', null),
      supabase.from('solicitudes_servicio').select('*', { count: 'exact', head: true }).eq('empresa_id', common.empresa_id).eq('estado', 'pendiente'),
      supabase.from('empresas').select('*').eq('id', common.empresa_id).maybeSingle(),
    ]);

    const tareas = tareasRes.data || [];
    const documentos = docsRes.data || [];
    const empresa = empresaRes.data;
    const today = new Date();

    const totalTareas = tareas.length;
    const tareasPendientes = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length;
    const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length;
    const tareasVencidas = tareas.filter(t => {
      if (!t.fecha_vencimiento || t.estado === 'completada') return false;
      return differenceInDays(new Date(t.fecha_vencimiento), today) < 0;
    }).length;

    const documentosPorVencer = documentos.filter(doc => {
      const dias = differenceInDays(new Date(doc.fecha_vencimiento!), today);
      return dias >= 0 && dias <= 30;
    }).length;

    const proximosVencimientos: Array<{ tipo: string; fecha: string; dias: number }> = [];
    if (empresa) {
      const checks = [
        { key: 'cert_iva_ieps_fecha_vencimiento', tipo: 'Certificación IVA/IEPS' },
        { key: 'matriz_seguridad_fecha_vencimiento', tipo: 'Matriz de Seguridad' },
        { key: 'immex_fecha_fin', tipo: 'Programa IMMEX' },
      ];
      checks.forEach(({ key, tipo }) => {
        const fecha = (empresa as any)[key];
        if (fecha) {
          const dias = differenceInDays(new Date(fecha), today);
          if (dias >= 0 && dias <= 90) {
            proximosVencimientos.push({ tipo, fecha, dias });
          }
        }
      });
    }

    const documentosVencimiento = documentos.map(doc => ({
      nombre: doc.nombre,
      empresa: empresa?.razon_social || 'N/A',
      dias: differenceInDays(new Date(doc.fecha_vencimiento!), today)
    })).filter(d => d.dias >= 0 && d.dias <= 90).slice(0, 5);

    const proximasTareas = await fetchProximasTareas(tareas);

    setData({
      ...DEFAULT_DATA,
      ...common,
      totalTareas,
      tareasPendientes,
      tareasCompletadas,
      tareasVencidas,
      documentosPorVencer,
      solicitudesPendientes: solicitudesRes.count || 0,
      proximosVencimientos,
      documentosVencimiento,
      proximasTareas,
      empresaCliente: empresa,
    });
  };

  return { data, loading, refetch: fetchAnalytics };
}
