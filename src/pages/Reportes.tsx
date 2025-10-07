import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, Download, Calendar, Building2, CheckSquare, AlertTriangle, User, Filter } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

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
  
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
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
    resumen: {
      totalEmpresas: 0,
      totalTareas: 0,
      tareasCompletadas: 0,
      tareasPendientes: 0,
      certificacionesVencer: 0,
      tasaCompletitud: 0
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

      // Build filters
      let tareasQuery = supabase
        .from('tareas')
        .select('*, empresa_id, consultor_asignado_id, categoria_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedEmpresa !== 'todas') {
        tareasQuery = tareasQuery.eq('empresa_id', selectedEmpresa);
      }

      if (selectedConsultor !== 'todos') {
        tareasQuery = tareasQuery.eq('consultor_asignado_id', selectedConsultor);
      }

      if (selectedCategoria !== 'todas') {
        tareasQuery = tareasQuery.eq('categoria_id', selectedCategoria);
      }

      if (selectedEstado !== 'todos') {
        tareasQuery = tareasQuery.eq('estado', selectedEstado as any);
      }

      const { data: tareas, error: tareasError } = await tareasQuery;
      if (tareasError) throw tareasError;

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
        resumen: {
          totalEmpresas: empresasData?.length || 0,
          totalTareas: total,
          tareasCompletadas: completadas,
          tareasPendientes: tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0,
          certificacionesVencer: allVencimientos.length,
          tasaCompletitud
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

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
          <Button onClick={exportToCSV} className="font-heading">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="estado">Estado</TabsTrigger>
            <TabsTrigger value="consultor">Consultores</TabsTrigger>
            <TabsTrigger value="empresa">Empresas</TabsTrigger>
            <TabsTrigger value="categoria">Categorías</TabsTrigger>
            <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="estado" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Tareas por Estado</CardTitle>
                  <CardDescription className="font-body">Distribución de tareas según su estado</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reporteData.tareasPorEstado}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Cantidad" radius={[8, 8, 0, 0]}>
                        {reporteData.tareasPorEstado.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={ESTADO_COLORS[entry.name as keyof typeof ESTADO_COLORS] || 'hsl(var(--primary))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading">Tareas por Prioridad</CardTitle>
                  <CardDescription className="font-body">Distribución según nivel de prioridad</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reporteData.tareasPorPrioridad}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {reporteData.tareasPorPrioridad.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORIDAD_COLORS[entry.name as keyof typeof PRIORIDAD_COLORS] || 'hsl(var(--primary))'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
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
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {reporteData.tareasPorCategoria.map((entry, index) => {
                          const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
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
                  {reporteData.rendimientoConsultores.map((consultor, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-primary" />
                          <h4 className="font-heading font-semibold">{consultor.name}</h4>
                        </div>
                        <span className="text-2xl font-heading font-bold text-primary">{consultor.tasa}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground font-body">Total</p>
                          <p className="font-heading font-bold">{consultor.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-body">Completadas</p>
                          <p className="font-heading font-bold text-success">{consultor.completadas}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-body">Pendientes</p>
                          <p className="font-heading font-bold text-warning">{consultor.pendientes}</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${consultor.tasa}%` }}
                        />
                      </div>
                    </div>
                  ))}
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
