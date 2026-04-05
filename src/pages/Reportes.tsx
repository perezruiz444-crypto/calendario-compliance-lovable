import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, Download, Calendar, Building2, CheckSquare, AlertTriangle, User, Filter, Mail, Send, FileDown, Clock, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { getCurrentPeriodKey, CATEGORIA_LABELS } from '@/lib/obligaciones';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateReportPDF } from '@/lib/pdfGenerator';
import * as XLSX from 'xlsx';

export default function Reportes() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mes_actual');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');
  const [selectedConsultor, setSelectedConsultor] = useState<string>('todos');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [tipoReporte, setTipoReporte] = useState<string>('general');
  
  const [empresas, setEmpresas] = useState<{ id: string; razon_social: string }[]>([]);
  const [consultores, setConsultores] = useState<{ id: string; nombre_completo: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  
  const [reporteData, setReporteData] = useState({
    tareasPorEstado: [] as any[],
    tareasPorPrioridad: [] as any[],
    tareasPorConsultor: [] as any[],
    tareasPorEmpresa: [] as any[],
    tareasPorCategoria: [] as any[],
    tareasTimeline: [] as any[],
    empresasConVencimientos: [] as any[],
    certificacionesVencimiento: [] as any[],
    rendimientoConsultores: [] as any[],
    tiempoPorConsultor: [] as any[],
    tiempoPorEmpresa: [] as any[],
    tiempoPorTarea: [] as any[],
    tareasDetalle: [] as any[],
    obligacionesPendientesDetalle: [] as any[],
    resumen: {
      totalEmpresas: 0,
      totalTareas: 0,
      tareasCompletadas: 0,
      tareasPendientes: 0,
      certificacionesVencer: 0,
      tasaCompletitud: 0,
      totalHorasTrabajadas: 0,
      horasFacturables: 0
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role && !['administrador', 'consultor'].includes(role)) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      fetchEmpresas();
      fetchConsultores();
      fetchCategorias();
    }
  }, [user, role]);

  useEffect(() => {
    if (empresas.length > 0 || selectedEmpresa === 'todas') {
      fetchReportData();
    }
  }, [selectedPeriod, selectedEmpresa, selectedConsultor, selectedCategoria, selectedEstado, tipoReporte, empresas]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const fetchConsultores = async () => {
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      if (rolesError) throw rolesError;

      const consultorIds = userRoles?.map(r => r.user_id) || [];

      if (consultorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorIds)
          .order('nombre_completo');

        if (profilesError) throw profilesError;
        setConsultores(profiles || []);
      }
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_tareas')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case 'mes_actual':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'mes_anterior':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'trimestre':
        startDate = startOfMonth(subMonths(now, 3));
        endDate = endOfMonth(now);
        break;
      case 'anio':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    setLoadingData(true);
    try {
      const { startDate, endDate } = getDateRange();

      // Query 1: Tareas del periodo (por created_at) para timeline y gráficas
      let tareasDelPeriodoQuery = supabase
        .from('tareas')
        .select('*, empresa_id, consultor_asignado_id, categoria_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Query 2: Tareas pendientes/en_progreso SIN filtro de fecha (siempre relevantes)
      let tareasPendientesQuery = supabase
        .from('tareas')
        .select('*, empresa_id, consultor_asignado_id, categoria_id')
        .in('estado', ['pendiente', 'en_progreso'] as any);

      // Aplicar filtros compartidos a ambas queries
      if (selectedEmpresa !== 'todas') {
        tareasDelPeriodoQuery = tareasDelPeriodoQuery.eq('empresa_id', selectedEmpresa);
        tareasPendientesQuery = tareasPendientesQuery.eq('empresa_id', selectedEmpresa);
      }

      if (selectedConsultor !== 'todos') {
        tareasDelPeriodoQuery = tareasDelPeriodoQuery.eq('consultor_asignado_id', selectedConsultor);
        tareasPendientesQuery = tareasPendientesQuery.eq('consultor_asignado_id', selectedConsultor);
      }

      if (selectedCategoria !== 'todas') {
        tareasDelPeriodoQuery = tareasDelPeriodoQuery.eq('categoria_id', selectedCategoria);
        tareasPendientesQuery = tareasPendientesQuery.eq('categoria_id', selectedCategoria);
      }

      if (selectedEstado !== 'todos') {
        tareasDelPeriodoQuery = tareasDelPeriodoQuery.eq('estado', selectedEstado as any);
        tareasPendientesQuery = tareasPendientesQuery.eq('estado', selectedEstado as any);
      }

      const [{ data: tareasDelPeriodo, error: tareasError }, { data: tareasPendientesData, error: pendientesError }] = await Promise.all([
        tareasDelPeriodoQuery,
        tareasPendientesQuery
      ]);
      if (tareasError) throw tareasError;
      if (pendientesError) throw pendientesError;

      // Merge: tareas del periodo + pendientes/en_progreso que no estén ya incluidas
      const tareasDelPeriodoIds = new Set(tareasDelPeriodo?.map(t => t.id) || []);
      const tareasPendientesExtra = (tareasPendientesData || []).filter(t => !tareasDelPeriodoIds.has(t.id));
      const tareas = [...(tareasDelPeriodo || []), ...tareasPendientesExtra];

      // Fetch empresas
      let empresasQuery = supabase.from('empresas').select('*');
      if (selectedEmpresa !== 'todas') {
        empresasQuery = empresasQuery.eq('id', selectedEmpresa);
      }

      const { data: empresasData, error: empresasError } = await empresasQuery;
      if (empresasError) throw empresasError;

      // Fetch profiles for consultor names
      const consultorIds = [...new Set(tareas?.map(t => t.consultor_asignado_id).filter(Boolean))];
      let consultorMap: Record<string, string> = {};
      
      if (consultorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorIds);
        
        consultorMap = profiles?.reduce((acc, p) => {
          acc[p.id] = p.nombre_completo;
          return acc;
        }, {} as Record<string, string>) || {};
      }

      // Fetch empresa names
      const empresaIds = [...new Set(tareas?.map(t => t.empresa_id))];
      let empresaMap: Record<string, string> = {};
      
      if (empresaIds.length > 0) {
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id, razon_social')
          .in('id', empresaIds);
        
        empresaMap = empresas?.reduce((acc, e) => {
          acc[e.id] = e.razon_social;
          return acc;
        }, {} as Record<string, string>) || {};
      }

      // Fetch categoria names
      const categoriaIds = [...new Set(tareas?.map(t => t.categoria_id).filter(Boolean))];
      let categoriaMap: Record<string, string> = {};
      
      if (categoriaIds.length > 0) {
        const { data: cats } = await supabase
          .from('categorias_tareas')
          .select('id, nombre')
          .in('id', categoriaIds);
        
        categoriaMap = cats?.reduce((acc, c) => {
          acc[c.id] = c.nombre;
          return acc;
        }, {} as Record<string, string>) || {};
      }

      // Process tareas por estado
      const estadoCounts = {
        Pendiente: tareas?.filter(t => t.estado === 'pendiente').length || 0,
        'En Progreso': tareas?.filter(t => t.estado === 'en_progreso').length || 0,
        Completada: tareas?.filter(t => t.estado === 'completada').length || 0,
        Cancelada: tareas?.filter(t => t.estado === 'cancelada').length || 0
      };

      const tareasPorEstado = Object.entries(estadoCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Process tareas por prioridad
      const prioridadCounts = {
        Alta: tareas?.filter(t => t.prioridad === 'alta').length || 0,
        Media: tareas?.filter(t => t.prioridad === 'media').length || 0,
        Baja: tareas?.filter(t => t.prioridad === 'baja').length || 0
      };

      const tareasPorPrioridad = Object.entries(prioridadCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Process certificaciones próximas a vencer (30 días)
      const today = new Date();
      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      const certificacionesVencimiento = empresasData?.filter(emp => {
        if (!emp.cert_iva_ieps_fecha_vencimiento) return false;
        const vencimiento = new Date(emp.cert_iva_ieps_fecha_vencimiento);
        return vencimiento >= today && vencimiento <= in30Days;
      }).map(emp => ({
        razon_social: emp.razon_social,
        fecha_vencimiento: emp.cert_iva_ieps_fecha_vencimiento,
        tipo: 'IVA e IEPS'
      })) || [];

      const matrizVencimientos = empresasData?.filter(emp => {
        if (!emp.matriz_seguridad_fecha_vencimiento) return false;
        const vencimiento = new Date(emp.matriz_seguridad_fecha_vencimiento);
        return vencimiento >= today && vencimiento <= in30Days;
      }).map(emp => ({
        razon_social: emp.razon_social,
        fecha_vencimiento: emp.matriz_seguridad_fecha_vencimiento,
        tipo: 'Matriz de Seguridad'
      })) || [];

      const allVencimientos = [...certificacionesVencimiento, ...matrizVencimientos];

      // Process tareas por consultor
      const consultorCounts: Record<string, number> = {};
      tareas?.forEach(t => {
        if (t.consultor_asignado_id) {
          const nombre = consultorMap[t.consultor_asignado_id] || 'Sin asignar';
          consultorCounts[nombre] = (consultorCounts[nombre] || 0) + 1;
        }
      });

      const tareasPorConsultor = Object.entries(consultorCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Process tareas por empresa
      const empresaCounts: Record<string, number> = {};
      tareas?.forEach(t => {
        const nombre = empresaMap[t.empresa_id] || 'Sin empresa';
        empresaCounts[nombre] = (empresaCounts[nombre] || 0) + 1;
      });

      const tareasPorEmpresa = Object.entries(empresaCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Process tareas por categoría
      const categoriaCounts: Record<string, number> = {};
      tareas?.forEach(t => {
        if (t.categoria_id) {
          const nombre = categoriaMap[t.categoria_id] || 'Sin categoría';
          categoriaCounts[nombre] = (categoriaCounts[nombre] || 0) + 1;
        }
      });

      const tareasPorCategoria = Object.entries(categoriaCounts).map(([name, value]) => ({
        name,
        value
      }));

      // Rendimiento de consultores
      const rendimientoConsultores = Object.keys(consultorCounts).map(nombre => {
        const tareasConsultor = tareas?.filter(t => 
          consultorMap[t.consultor_asignado_id] === nombre
        ) || [];
        
        const completadas = tareasConsultor.filter(t => t.estado === 'completada').length;
        const total = tareasConsultor.length;
        const tasa = total > 0 ? Math.round((completadas / total) * 100) : 0;

        return {
          name: nombre,
          completadas,
          pendientes: tareasConsultor.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length,
          total,
          tasa
        };
      });

      // Timeline de tareas (últimos 12 meses)
      const tareasTimeline: Record<string, any> = {};
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'MMM yyyy', { locale: es });
        tareasTimeline[monthKey] = {
          mes: monthKey,
          creadas: 0,
          completadas: 0
        };
      }

      tareas?.forEach(t => {
        const createdMonth = format(new Date(t.created_at), 'MMM yyyy', { locale: es });
        if (tareasTimeline[createdMonth]) {
          tareasTimeline[createdMonth].creadas++;
          if (t.estado === 'completada') {
            tareasTimeline[createdMonth].completadas++;
          }
        }
      });

      const completadas = tareas?.filter(t => t.estado === 'completada').length || 0;
      const total = tareas?.length || 0;
      const tasaCompletitud = total > 0 ? Math.round((completadas / total) * 100) : 0;

      // Fetch time entries for time tracking reports
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*, user_id, tarea_id')
        .gte('inicio', startDate.toISOString())
        .lte('inicio', endDate.toISOString());

      // Calculate time by consultor
      const tiempoPorConsultor: Record<string, { total: number; facturable: number }> = {};
      timeEntries?.forEach(entry => {
        const nombre = consultorMap[entry.user_id] || 'Sin asignar';
        if (!tiempoPorConsultor[nombre]) {
          tiempoPorConsultor[nombre] = { total: 0, facturable: 0 };
        }
        const minutos = entry.duracion_minutos || 0;
        tiempoPorConsultor[nombre].total += minutos;
        if (entry.facturable) {
          tiempoPorConsultor[nombre].facturable += minutos;
        }
      });

      const tiempoPorConsultorArray = Object.entries(tiempoPorConsultor).map(([name, data]) => ({
        name,
        horas: Math.round((data.total / 60) * 10) / 10,
        facturable: Math.round((data.facturable / 60) * 10) / 10
      }));

      // Calculate time by empresa
      const tiempoPorEmpresa: Record<string, number> = {};
      timeEntries?.forEach(entry => {
        const tarea = tareas?.find(t => t.id === entry.tarea_id);
        if (tarea) {
          const nombre = empresaMap[tarea.empresa_id] || 'Sin empresa';
          tiempoPorEmpresa[nombre] = (tiempoPorEmpresa[nombre] || 0) + (entry.duracion_minutos || 0);
        }
      });

      const tiempoPorEmpresaArray = Object.entries(tiempoPorEmpresa)
        .map(([name, minutos]) => ({
          name,
          horas: Math.round((minutos / 60) * 10) / 10
        }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 10);

      // Calculate time by tarea (top 10)
      const tiempoPorTarea: Record<string, number> = {};
      timeEntries?.forEach(entry => {
        const tarea = tareas?.find(t => t.id === entry.tarea_id);
        if (tarea) {
          tiempoPorTarea[tarea.titulo] = (tiempoPorTarea[tarea.titulo] || 0) + (entry.duracion_minutos || 0);
        }
      });

      const tiempoPorTareaArray = Object.entries(tiempoPorTarea)
        .map(([name, minutos]) => ({
          name,
          horas: Math.round((minutos / 60) * 10) / 10
        }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 10);

      const totalMinutos = timeEntries?.reduce((sum, e) => sum + (e.duracion_minutos || 0), 0) || 0;
      const totalHorasTrabajadas = Math.round((totalMinutos / 60) * 10) / 10;
      const minutosFacturables = timeEntries?.filter(e => e.facturable).reduce((sum, e) => sum + (e.duracion_minutos || 0), 0) || 0;
      const horasFacturables = Math.round((minutosFacturables / 60) * 10) / 10;

      // Build detailed task list for PDF
      const tareasDetalle = (tareas || []).map(t => ({
        titulo: t.titulo,
        empresa: empresaMap[t.empresa_id] || '-',
        consultor: t.consultor_asignado_id ? (consultorMap[t.consultor_asignado_id] || 'Sin asignar') : 'Sin asignar',
        prioridad: t.prioridad || 'media',
        estado: t.estado || 'pendiente',
        fecha_vencimiento: t.fecha_vencimiento,
        created_at: t.created_at,
        categoria: t.categoria_id ? (categoriaMap[t.categoria_id] || '-') : '-',
      }));

      // Fetch obligaciones activas pendientes de cumplimiento
      let obQuery = supabase.from('obligaciones').select('id, nombre, categoria, presentacion, fecha_vencimiento, empresa_id').eq('activa', true);
      if (selectedEmpresa !== 'todas') {
        obQuery = obQuery.eq('empresa_id', selectedEmpresa);
      }
      const { data: obligacionesActivas } = await obQuery;

      let obligacionesPendientesDetalle: Array<{ nombre: string; empresa: string; categoria: string; fecha_vencimiento: string | null }> = [];
      let obPendientesCount = 0;

      if (obligacionesActivas && obligacionesActivas.length > 0) {
        const obIds = obligacionesActivas.map(o => o.id);
        const { data: cumplimientos } = await supabase
          .from('obligacion_cumplimientos')
          .select('obligacion_id, periodo_key')
          .in('obligacion_id', obIds)
          .eq('completada', true);

        const cumplSet = new Set((cumplimientos || []).map(c => `${c.obligacion_id}:${c.periodo_key}`));

        obligacionesPendientesDetalle = obligacionesActivas
          .filter(ob => {
            const pk = getCurrentPeriodKey(ob.presentacion);
            return !cumplSet.has(`${ob.id}:${pk}`);
          })
          .map(ob => ({
            nombre: ob.nombre,
            empresa: empresaMap[ob.empresa_id] || empresasData?.find(e => e.id === ob.empresa_id)?.razon_social || '-',
            categoria: CATEGORIA_LABELS[ob.categoria] || ob.categoria,
            fecha_vencimiento: ob.fecha_vencimiento,
          }));
        obPendientesCount = obligacionesPendientesDetalle.length;
      }

      const tareasPendientesCount = tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0;

      setReporteData({
        tareasPorEstado,
        tareasPorPrioridad,
        tareasPorConsultor,
        tareasPorEmpresa,
        tareasPorCategoria,
        tareasTimeline: Object.values(tareasTimeline),
        empresasConVencimientos: empresasData || [],
        certificacionesVencimiento: allVencimientos,
        rendimientoConsultores,
        tiempoPorConsultor: tiempoPorConsultorArray,
        tiempoPorEmpresa: tiempoPorEmpresaArray,
        tiempoPorTarea: tiempoPorTareaArray,
        tareasDetalle,
        obligacionesPendientesDetalle,
        resumen: {
          totalEmpresas: empresasData?.length || 0,
          totalTareas: total + (obligacionesActivas?.length || 0),
          tareasCompletadas: completadas,
          tareasPendientes: tareasPendientesCount + obPendientesCount,
          certificacionesVencer: allVencimientos.length,
          tasaCompletitud,
          totalHorasTrabajadas,
          horasFacturables
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const exportToCSV = () => {
    const rows = [
      ['Reporte de Tareas - ' + tipoReporte.toUpperCase()],
      ['Período: ' + selectedPeriod],
      [''],
      ['Resumen'],
      ['Total Empresas', reporteData.resumen.totalEmpresas],
      ['Total Tareas', reporteData.resumen.totalTareas],
      ['Tareas Completadas', reporteData.resumen.tareasCompletadas],
      ['Tareas Pendientes', reporteData.resumen.tareasPendientes],
      ['Tasa de Completitud', reporteData.resumen.tasaCompletitud + '%'],
      ['Certificaciones por Vencer', reporteData.resumen.certificacionesVencer],
      [''],
      ['Tareas por Estado'],
      ...reporteData.tareasPorEstado.map(d => [d.name, d.value]),
      [''],
      ['Tareas por Prioridad'],
      ...reporteData.tareasPorPrioridad.map(d => [d.name, d.value])
    ];

    if (reporteData.obligacionesPendientesDetalle.length > 0) {
      rows.push(
        [''],
        ['Obligaciones Pendientes de Cumplimiento'],
        ['Nombre', 'Empresa', 'Categoría', 'Fecha Vencimiento'],
        ...reporteData.obligacionesPendientesDetalle.map(o => [
          o.nombre,
          o.empresa,
          o.categoria,
          o.fecha_vencimiento ? format(new Date(o.fecha_vencimiento), 'dd/MM/yyyy') : '-'
        ])
      );
    }

    if (tipoReporte === 'consultores' && reporteData.tareasPorConsultor.length > 0) {
      rows.push(
        [''],
        ['Tareas por Consultor'],
        ...reporteData.tareasPorConsultor.map(d => [d.name, d.value])
      );
    }

    if (tipoReporte === 'empresas' && reporteData.tareasPorEmpresa.length > 0) {
      rows.push(
        [''],
        ['Tareas por Empresa'],
        ...reporteData.tareasPorEmpresa.map(d => [d.name, d.value])
      );
    }

    if (reporteData.certificacionesVencimiento.length > 0) {
      rows.push(
        [''],
        ['Certificaciones Próximas a Vencer'],
        ['Empresa', 'Tipo', 'Fecha Vencimiento'],
        ...reporteData.certificacionesVencimiento.map(c => [
          c.razon_social,
          c.tipo,
          format(new Date(c.fecha_vencimiento), 'dd/MM/yyyy')
        ])
      );
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${tipoReporte}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportObligacionesExcel = () => {
    if (!reporteData.obligacionesPendientesDetalle?.length) {
      toast.error('No hay obligaciones pendientes para exportar');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      reporteData.obligacionesPendientesDetalle.map(o => ({
        'Obligación': o.nombre,
        'Empresa': o.empresa,
        'Programa': CATEGORIA_LABELS[o.categoria] || o.categoria,
        'Vencimiento': o.fecha_vencimiento
          ? new Date(o.fecha_vencimiento).toLocaleDateString('es-MX')
          : '—',
        'Estado': 'Pendiente',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Obligaciones');
    XLSX.writeFile(wb, `obligaciones-pendientes-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exportado correctamente');
  };

  if (loading || loadingData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-[0.625rem]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-[0.625rem]" />)}
        </div>
      </div>
    );
  }

  const CATEGORY_COLORS = ['#003366', '#D52B1E', '#2B8B4F', '#E8A800', '#004080', '#7B4F9E', '#C2660D', '#0F7B8A'];

  const ESTADO_COLORS = {
    'Pendiente': 'hsl(var(--warning))',
    'En Progreso': 'hsl(var(--primary))',
    'Completada': 'hsl(var(--success))',
    'Cancelada': 'hsl(var(--muted))'
  };

  const PRIORIDAD_COLORS = {
    'Alta': 'hsl(var(--destructive))',
    'Media': 'hsl(var(--warning))',
    'Baja': 'hsl(var(--success))'
  };

  return (
    <DashboardLayout currentPage="/reportes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Reportes
            </h1>
            <p className="text-muted-foreground font-body">
              Análisis y estadísticas del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportObligacionesExcel} variant="outline" className="font-heading gap-1.5">
              <FileDown className="w-4 h-4" />
              Obligaciones Excel
            </Button>
            <Button onClick={exportToCSV} className="font-heading" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            {selectedEmpresa && selectedEmpresa !== 'todas' && (
              <>
                <Button 
                  onClick={async () => {
                    try {
                      // Get empresa data first
                      const { data: empresa, error: empresaError } = await supabase
                        .from('empresas')
                        .select('razon_social, rfc')
                        .eq('id', selectedEmpresa)
                        .maybeSingle();
                      
                      if (empresaError) throw empresaError;
                      if (!empresa) throw new Error('Empresa no encontrada');
                      
                      await generateReportPDF(empresa, reporteData, selectedPeriod, tipoReporte);
                      
                      toast.success("PDF generado — el reporte se ha descargado correctamente");
                    } catch (err: unknown) {
                      console.error('Error generating PDF:', err);
                      toast.error(err instanceof Error ? err.message : 'Error al generar PDF');
                    }
                  }}
                  className="font-heading"
                  variant="outline"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      const { error } = await supabase.functions.invoke('send-report-email', {
                        body: { 
                          empresaId: selectedEmpresa, 
                          reportData: reporteData, 
                          period: selectedPeriod, 
                          reportType: tipoReporte 
                        }
                      });
                      if (error) throw error;
                      toast.success("Reporte enviado por email a los clientes");
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : 'Error al enviar reporte');
                    }
                  }}
                  className="font-heading"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar por Email
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filtros */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Tipo de Reporte
                </label>
                <Select value={tipoReporte} onValueChange={setTipoReporte}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="consultores">Por Consultor</SelectItem>
                    <SelectItem value="empresas">Por Empresa</SelectItem>
                    <SelectItem value="categorias">Por Categoría</SelectItem>
                    <SelectItem value="rendimiento">Rendimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Período
                </label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mes_actual">Mes Actual</SelectItem>
                    <SelectItem value="mes_anterior">Mes Anterior</SelectItem>
                    <SelectItem value="trimestre">Último Trimestre</SelectItem>
                    <SelectItem value="anio">Año Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Empresa
                </label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {empresas.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Consultor
                </label>
                <Select value={selectedConsultor} onValueChange={setSelectedConsultor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {consultores.map(cons => (
                      <SelectItem key={cons.id} value={cons.id}>
                        {cons.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Categoría
                </label>
                <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-heading font-medium mb-2 block">
                  Estado
                </label>
                <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Cards */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="gradient-card shadow-elegant hover-scale">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Total Empresas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-primary" />
                  <div className="text-2xl font-heading font-bold">{reporteData.resumen.totalEmpresas}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-elegant hover-scale">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Total Tareas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-2xl font-heading font-bold">{reporteData.resumen.totalTareas}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-elegant hover-scale">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Completadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-8 h-8 text-success" />
                  <div className="text-2xl font-heading font-bold text-success">{reporteData.resumen.tareasCompletadas}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-elegant hover-scale">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-warning" />
                  <div className="text-2xl font-heading font-bold text-warning">{reporteData.resumen.tareasPendientes}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-elegant hover-scale">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading">Por Vencer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                  <div className="text-2xl font-heading font-bold text-destructive">{reporteData.resumen.certificacionesVencer}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="gradient-card shadow-elegant">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <CheckSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-medium text-muted-foreground">Tasa de Completitud</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">
                      {reporteData.resumen.tareasCompletadas} de {reporteData.resumen.totalTareas} tareas completadas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-heading font-bold text-primary">{reporteData.resumen.tasaCompletitud}%</p>
                </div>
              </div>
              <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500" 
                  style={{ width: `${reporteData.resumen.tasaCompletitud}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficas según tipo de reporte */}
        <Tabs defaultValue="estado" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="estado">Estado</TabsTrigger>
            <TabsTrigger value="consultor">Consultores</TabsTrigger>
            <TabsTrigger value="empresa">Empresas</TabsTrigger>
            <TabsTrigger value="categoria">Categorías</TabsTrigger>
            <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
            <TabsTrigger value="tiempo">
              <Clock className="w-4 h-4 mr-2" />
              Tiempo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estado" className="space-y-6">
            {/* Status summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Pendiente', icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', count: reporteData.tareasPorEstado.find(e => e.name === 'Pendiente')?.value || 0 },
                { label: 'En Progreso', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', count: reporteData.tareasPorEstado.find(e => e.name === 'En Progreso')?.value || 0 },
                { label: 'Completada', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', count: reporteData.tareasPorEstado.find(e => e.name === 'Completada')?.value || 0 },
                { label: 'Cancelada', icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-muted', count: reporteData.tareasPorEstado.find(e => e.name === 'Cancelada')?.value || 0 },
              ].map(item => {
                const total = reporteData.resumen.totalTareas || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <Card key={item.label} className={`${item.border} border-2`}>
                    <CardContent className="pt-5 pb-4 px-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${item.bg} p-2 rounded-lg`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground truncate">{item.label}</p>
                          <p className={`text-2xl font-heading font-bold ${item.color}`}>{item.count}</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${item.bg} rounded-full transition-all duration-500`} style={{ width: `${pct}%`, backgroundColor: `var(--${item.label === 'Pendiente' ? 'warning' : item.label === 'En Progreso' ? 'primary' : item.label === 'Completada' ? 'success' : 'muted-foreground'})`, opacity: 0.6 }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{pct}% del total</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut chart for status */}
              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Distribución por Estado</CardTitle>
                  <CardDescription className="font-body">Vista general de tareas y obligaciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reporteData.tareasPorEstado.filter(e => e.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {reporteData.tareasPorEstado.filter(e => e.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.name as keyof typeof ESTADO_COLORS] || 'hsl(var(--primary))'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Tareas']} />
                      <Legend iconType="circle" />
                      {/* Central label */}
                      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-3xl font-bold">{reporteData.resumen.totalTareas}</text>
                      <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">Total</text>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Donut chart for priority */}
              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Distribución por Prioridad</CardTitle>
                  <CardDescription className="font-body">Nivel de urgencia de las tareas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reporteData.tareasPorPrioridad.filter(e => e.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {reporteData.tareasPorPrioridad.filter(e => e.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORIDAD_COLORS[entry.name as keyof typeof PRIORIDAD_COLORS] || 'hsl(var(--primary))'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Tareas']} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Obligaciones pendientes table */}
            {reporteData.obligacionesPendientesDetalle.length > 0 && (
              <Card className="gradient-card shadow-card border-warning/20">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Obligaciones Pendientes de Cumplimiento
                  </CardTitle>
                  <CardDescription className="font-body">Obligaciones activas sin cumplir en el periodo actual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {reporteData.obligacionesPendientesDetalle.map((ob, idx) => {
                      const dias = ob.fecha_vencimiento ? differenceInDays(new Date(ob.fecha_vencimiento), new Date()) : null;
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-warning/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ob.nombre}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{ob.empresa}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ob.categoria}</span>
                            </div>
                          </div>
                          {dias !== null && (
                            <Badge variant={dias <= 0 ? 'destructive' : dias <= 7 ? 'destructive' : dias <= 30 ? 'secondary' : 'default'}>
                              {dias <= 0 ? 'Vencida' : `${dias}d`}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="consultor" className="space-y-6">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Tareas por Consultor</CardTitle>
                <CardDescription className="font-body">Distribución de tareas entre consultores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reporteData.tareasPorConsultor}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={100} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Tareas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="empresa" className="space-y-6">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Top 10 Empresas por Tareas</CardTitle>
                <CardDescription className="font-body">Empresas con más tareas registradas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reporteData.tareasPorEmpresa} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" style={{ fontSize: '12px' }} />
                    <YAxis dataKey="name" type="category" style={{ fontSize: '11px' }} width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Tareas" fill="hsl(var(--success))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categoria" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Tareas por Categoría</CardTitle>
                  <CardDescription className="font-body">Distribución por categorías</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={reporteData.tareasPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reporteData.tareasPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Timeline de Tareas</CardTitle>
                  <CardDescription className="font-body">Creadas vs Completadas (12 meses)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={reporteData.tareasTimeline}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="mes" style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="creadas" stroke="hsl(var(--primary))" strokeWidth={2} name="Creadas" />
                      <Line type="monotone" dataKey="completadas" stroke="hsl(var(--success))" strokeWidth={2} name="Completadas" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rendimiento" className="space-y-6">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Rendimiento por Consultor</CardTitle>
                <CardDescription className="font-body">Tasa de completitud y estadísticas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reporteData.rendimientoConsultores.map((consultor, idx) => {
                    const progressColor = consultor.tasa < 50 ? 'from-destructive to-destructive/70' : consultor.tasa < 80 ? 'from-warning to-warning/70' : 'from-success to-success/70';
                    return (
                      <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <h4 className="font-heading font-semibold">{consultor.name}</h4>
                          </div>
                          <span className={`text-2xl font-heading font-bold ${consultor.tasa < 50 ? 'text-destructive' : consultor.tasa < 80 ? 'text-warning' : 'text-success'}`}>{consultor.tasa}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-muted-foreground font-body text-xs">Total</p>
                            <p className="font-heading font-bold text-lg">{consultor.total}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-success/10">
                            <p className="text-muted-foreground font-body text-xs">Completadas</p>
                            <p className="font-heading font-bold text-lg text-success">{consultor.completadas}</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-warning/10">
                            <p className="text-muted-foreground font-body text-xs">Pendientes</p>
                            <p className="font-heading font-bold text-lg text-warning">{consultor.pendientes}</p>
                          </div>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`} 
                            style={{ width: `${consultor.tasa}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {reporteData.rendimientoConsultores.length === 0 && (
                    <p className="text-center text-muted-foreground font-body py-8">
                      No hay datos de rendimiento disponibles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Certificaciones por Vencer */}
        {reporteData.certificacionesVencimiento.length > 0 && (
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Certificaciones Próximas a Vencer
              </CardTitle>
              <CardDescription className="font-body">
                Certificaciones que vencen en los próximos 30 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reporteData.certificacionesVencimiento.map((cert, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:border-destructive transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-heading font-semibold">{cert.razon_social}</h4>
                        <p className="text-sm text-muted-foreground font-body">{cert.tipo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-heading font-medium text-destructive">
                          Vence: {format(new Date(cert.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
