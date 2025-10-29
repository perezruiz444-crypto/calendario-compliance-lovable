import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Building2, CheckSquare, Users, TrendingUp, Calendar, Clock, AlertCircle, Shield, FileText } from 'lucide-react';
import { format, isAfter, isBefore, addDays, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    empresas: 0,
    tareasPendientes: 0,
    tareasCompletadas: 0,
    usuarios: 0,
    cumplimiento: 0
  });
  const [proximasTareas, setProximasTareas] = useState<any[]>([]);
  const [empresaCliente, setEmpresaCliente] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      // For cliente role, fetch their empresa info
      if (role === 'cliente') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('id', user?.id)
          .single();

        if (profile?.empresa_id) {
          const { data: empresa } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', profile.empresa_id)
            .single();
          
          setEmpresaCliente(empresa);
        }
      }

      // Fetch empresas count
      const empresasQuery = supabase.from('empresas').select('id', { count: 'exact', head: true });
      
      // Fetch tareas
      const tareasQuery = supabase
        .from('tareas')
        .select('*')
        .order('fecha_vencimiento', { ascending: true })
        .limit(5);

      // Fetch usuarios count (only for admin)
      const usuariosQuery = role === 'administrador' 
        ? supabase.from('profiles').select('id', { count: 'exact', head: true })
        : null;

      const [empresasRes, tareasRes, usuariosRes] = await Promise.all([
        empresasQuery,
        tareasQuery,
        usuariosQuery
      ]);

      const tareas = tareasRes.data || [];
      const pendientes = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso');
      const completadas = tareas.filter(t => t.estado === 'completada');
      const totalTareas = tareas.length;
      const cumplimiento = totalTareas > 0 ? Math.round((completadas.length / totalTareas) * 100) : 0;

      setStats({
        empresas: empresasRes.count || 0,
        tareasPendientes: pendientes.length,
        tareasCompletadas: completadas.length,
        usuarios: usuariosRes?.count || 0,
        cumplimiento
      });

      // Set próximas tareas
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const tareasProximas = tareas
        .filter(t => {
          if (!t.fecha_vencimiento) return false;
          const fecha = new Date(t.fecha_vencimiento);
          return isAfter(fecha, today) && isBefore(fecha, nextWeek);
        })
        .slice(0, 5);

      // Fetch empresa names for tareas
      if (tareasProximas.length > 0) {
        const { data: empresasData } = await supabase
          .from('empresas')
          .select('id, razon_social')
          .in('id', tareasProximas.map(t => t.empresa_id));

        const empresasMap = empresasData?.reduce((acc, emp) => {
          acc[emp.id] = emp.razon_social;
          return acc;
        }, {} as Record<string, string>) || {};

        setProximasTareas(tareasProximas.map(t => ({
          ...t,
          empresa_nombre: empresasMap[t.empresa_id]
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-destructive text-destructive-foreground';
      case 'media': return 'bg-warning text-warning-foreground';
      case 'baja': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-warning text-warning-foreground';
      case 'en_progreso': return 'bg-primary text-primary-foreground';
      case 'completada': return 'bg-success text-success-foreground';
      case 'cancelada': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada'
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Empresas',
      value: stats.empresas.toString(),
      description: 'Empresas registradas',
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      show: true
    },
    {
      title: 'Tareas Pendientes',
      value: stats.tareasPendientes.toString(),
      description: 'Requieren atención',
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      show: true
    },
    {
      title: 'Completadas',
      value: stats.tareasCompletadas.toString(),
      description: 'Tareas finalizadas',
      icon: CheckSquare,
      color: 'text-success',
      bgColor: 'bg-success/10',
      show: true
    },
    {
      title: 'Usuarios',
      value: stats.usuarios.toString(),
      description: 'Usuarios activos',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      show: role === 'administrador'
    },
  ];

  const getVencimientoAlert = (fecha: string | null) => {
    if (!fecha) return null;
    const dias = differenceInDays(parseISO(fecha), new Date());
    
    if (dias < 0) return { color: 'destructive', text: 'Vencido', dias };
    if (dias <= 30) return { color: 'warning', text: `${dias} días`, dias };
    return { color: 'default', text: `${dias} días`, dias };
  };

  return (
    <DashboardLayout currentPage="/dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground font-body">
            Bienvenido {role === 'administrador' ? 'Administrador' : role === 'consultor' ? 'Consultor' : 'Cliente'}
          </p>
        </div>

        {/* Widget Mi Empresa para Clientes */}
        {role === 'cliente' && empresaCliente && (
          <Card className="gradient-card shadow-elegant border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {empresaCliente.razon_social}
                  </CardTitle>
                  <CardDescription className="font-body">
                    RFC: {empresaCliente.rfc}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate('/mi-empresa')}
                  className="gradient-primary shadow-elegant font-heading"
                >
                  Ver Detalles
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Alertas de vencimiento */}
              {(empresaCliente.cert_iva_ieps_fecha_vencimiento || 
                empresaCliente.matriz_seguridad_fecha_vencimiento || 
                empresaCliente.immex_fecha_fin) && (
                <div className="space-y-2">
                  <p className="text-sm font-heading font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Próximos Vencimientos
                  </p>
                  
                  {empresaCliente.cert_iva_ieps_fecha_vencimiento && 
                   (() => {
                     const alert = getVencimientoAlert(empresaCliente.cert_iva_ieps_fecha_vencimiento);
                     return alert && alert.dias <= 90 ? (
                       <div className="flex items-center justify-between p-2 bg-background/50 rounded border">
                         <div className="flex items-center gap-2">
                           <Shield className="w-4 h-4 text-muted-foreground" />
                           <span className="text-xs font-body">Cert. IVA/IEPS</span>
                         </div>
                         <Badge variant={alert.color as any} className="text-xs">
                           {alert.text}
                         </Badge>
                       </div>
                     ) : null;
                   })()}
                  
                  {empresaCliente.matriz_seguridad_fecha_vencimiento && 
                   (() => {
                     const alert = getVencimientoAlert(empresaCliente.matriz_seguridad_fecha_vencimiento);
                     return alert && alert.dias <= 90 ? (
                       <div className="flex items-center justify-between p-2 bg-background/50 rounded border">
                         <div className="flex items-center gap-2">
                           <Shield className="w-4 h-4 text-muted-foreground" />
                           <span className="text-xs font-body">Matriz Seguridad</span>
                         </div>
                         <Badge variant={alert.color as any} className="text-xs">
                           {alert.text}
                         </Badge>
                       </div>
                     ) : null;
                   })()}
                  
                  {empresaCliente.immex_fecha_fin && 
                   (() => {
                     const alert = getVencimientoAlert(empresaCliente.immex_fecha_fin);
                     return alert && alert.dias <= 90 ? (
                       <div className="flex items-center justify-between p-2 bg-background/50 rounded border">
                         <div className="flex items-center gap-2">
                           <FileText className="w-4 h-4 text-muted-foreground" />
                           <span className="text-xs font-body">Programa IMMEX</span>
                         </div>
                         <Badge variant={alert.color as any} className="text-xs">
                           {alert.text}
                         </Badge>
                       </div>
                     ) : null;
                   })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.filter(stat => stat.show).map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="gradient-card shadow-elegant hover:shadow-card transition-smooth hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-heading font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cumplimiento Progress */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progreso de Cumplimiento
            </CardTitle>
            <CardDescription className="font-body">
              Porcentaje de tareas completadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-heading font-medium">Cumplimiento General</span>
                <span className="text-2xl font-heading font-bold text-primary">{stats.cumplimiento}%</span>
              </div>
              <Progress value={stats.cumplimiento} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-xs font-heading font-medium text-muted-foreground">Completadas</p>
                <p className="text-lg font-heading font-bold text-success">{stats.tareasCompletadas}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-heading font-medium text-muted-foreground">Pendientes</p>
                <p className="text-lg font-heading font-bold text-warning">{stats.tareasPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximas Tareas */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Próximas Tareas
                </CardTitle>
                <CardDescription className="font-body">
                  Tareas con vencimiento en los próximos 7 días
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/tareas')}
                className="font-heading"
              >
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {proximasTareas.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-success" />
                </div>
                <p className="text-muted-foreground font-body mb-2">
                  ¡Excelente! No hay tareas próximas a vencer
                </p>
                <p className="text-sm text-muted-foreground font-body">
                  Todas las tareas urgentes están bajo control
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proximasTareas.map((tarea) => (
                  <div 
                    key={tarea.id} 
                    className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer hover-scale animate-fade-in"
                    onClick={() => navigate('/tareas')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-heading font-semibold">{tarea.titulo}</h4>
                          <Badge className={getPrioridadColor(tarea.prioridad)} variant="secondary">
                            {tarea.prioridad}
                          </Badge>
                          <Badge className={getEstadoColor(tarea.estado)}>
                            {estadoLabels[tarea.estado]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                          {tarea.empresa_nombre && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {tarea.empresa_nombre}
                            </span>
                          )}
                          {tarea.fecha_vencimiento && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Vence: {format(new Date(tarea.fecha_vencimiento), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
