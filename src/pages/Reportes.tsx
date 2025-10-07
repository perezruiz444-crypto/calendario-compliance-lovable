import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileText, Download, Calendar, Building2, CheckSquare, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Reportes() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mes_actual');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  const [reporteData, setReporteData] = useState({
    tareasPorEstado: [] as any[],
    tareasPorPrioridad: [] as any[],
    empresasConVencimientos: [] as any[],
    certificacionesVencimiento: [] as any[],
    resumen: {
      totalEmpresas: 0,
      totalTareas: 0,
      tareasCompletadas: 0,
      tareasPendientes: 0,
      certificacionesVencer: 0
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
    }
  }, [user, role]);

  useEffect(() => {
    if (empresas.length > 0 || selectedEmpresa === 'todas') {
      fetchReportData();
    }
  }, [selectedPeriod, selectedEmpresa, empresas]);

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

      // Build empresa filter
      let empresaFilter = selectedEmpresa !== 'todas' ? selectedEmpresa : null;

      // Fetch tareas
      let tareasQuery = supabase
        .from('tareas')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (empresaFilter) {
        tareasQuery = tareasQuery.eq('empresa_id', empresaFilter);
      }

      const { data: tareas, error: tareasError } = await tareasQuery;
      if (tareasError) throw tareasError;

      // Fetch empresas
      let empresasQuery = supabase.from('empresas').select('*');
      if (empresaFilter) {
        empresasQuery = empresasQuery.eq('id', empresaFilter);
      }

      const { data: empresasData, error: empresasError } = await empresasQuery;
      if (empresasError) throw empresasError;

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

      setReporteData({
        tareasPorEstado,
        tareasPorPrioridad,
        empresasConVencimientos: empresasData || [],
        certificacionesVencimiento: allVencimientos,
        resumen: {
          totalEmpresas: empresasData?.length || 0,
          totalTareas: tareas?.length || 0,
          tareasCompletadas: tareas?.filter(t => t.estado === 'completada').length || 0,
          tareasPendientes: tareas?.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length || 0,
          certificacionesVencer: allVencimientos.length
        }
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const exportToCSV = () => {
    // Simple CSV export
    const rows = [
      ['Reporte de Tareas'],
      [''],
      ['Resumen'],
      ['Total Empresas', reporteData.resumen.totalEmpresas],
      ['Total Tareas', reporteData.resumen.totalTareas],
      ['Tareas Completadas', reporteData.resumen.tareasCompletadas],
      ['Tareas Pendientes', reporteData.resumen.tareasPendientes],
      ['Certificaciones por Vencer', reporteData.resumen.certificacionesVencer],
      [''],
      ['Tareas por Estado'],
      ...reporteData.tareasPorEstado.map(d => [d.name, d.value]),
      [''],
      ['Certificaciones Próximas a Vencer'],
      ['Empresa', 'Tipo', 'Fecha Vencimiento'],
      ...reporteData.certificacionesVencimiento.map(c => [
        c.razon_social,
        c.tipo,
        format(new Date(c.fecha_vencimiento), 'dd/MM/yyyy')
      ])
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
            <CardTitle className="font-heading">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="text-sm font-heading font-medium mb-2 block">
                Empresa
              </label>
              <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Empresas</SelectItem>
                  {empresas.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Cards */}
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

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tareas por Estado */}
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

          {/* Tareas por Prioridad */}
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
