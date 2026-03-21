import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckSquare, Users, AlertCircle, AlertTriangle, TrendingUp, Calendar, Clock, Target, FileText, Plus, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import DashboardObligaciones from '@/components/dashboard/DashboardObligaciones';
import EmpresaComplianceSemaforo from '@/components/dashboard/EmpresaComplianceSemaforo';
import DashboardMensajes from '@/components/dashboard/DashboardMensajes';
import AdminAnalytics from '@/components/dashboard/AdminAnalytics';
import ConsultorAnalytics from '@/components/dashboard/ConsultorAnalytics';
import ClienteAnalytics from '@/components/dashboard/ClienteAnalytics';
import CreateTareaSheet from '@/components/tareas/CreateTareaSheet';
import TareaDetailSheet from '@/components/tareas/TareaDetailSheet';
import AgendaHoy from '@/components/dashboard/AgendaHoy';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

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
    default: return 'bg-muted';
  }
};

const estadoLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  cancelada: 'Cancelada'
};

export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();
  const { data, loading: analyticsLoading, refetch } = useAnalytics(selectedEmpresaId);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const firstName = data.nombreUsuario?.split(' ')[0] || 'Usuario';

  const handleQuickComplete = async (e: React.MouseEvent, tareaId: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('tareas').update({ estado: 'completada' }).eq('id', tareaId);
      if (error) throw error;
      toast.success('Tarea completada');
      refetch();
    } catch {
      toast.error('Error al completar tarea');
    }
  };

  const kpiCards = role === 'administrador' ? [
    { title: 'Empresas Activas', value: data.totalEmpresas || 0, icon: Building2, color: 'text-primary', bgColor: 'bg-primary/10', sub: 'Total registradas' },
    { title: 'Total Usuarios', value: data.totalUsuarios || 0, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10', sub: `${data.totalConsultores || 0} consultores` },
    { title: 'Tareas Vencidas', value: data.tareasVencidas, icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', sub: 'Requieren atención', valueColor: 'text-destructive' },
    { title: 'Tasa Cumplimiento', value: `${data.totalTareas > 0 ? Math.round((data.tareasCompletadas / data.totalTareas) * 100) : 0}%`, icon: TrendingUp, color: 'text-success', bgColor: 'bg-success/10', sub: `${data.tareasCompletadas} completadas`, valueColor: 'text-success' },
  ] : role === 'consultor' ? [
    { title: 'Mis Empresas', value: data.misEmpresas || 0, icon: Building2, color: 'text-primary', bgColor: 'bg-primary/10', sub: 'Empresas asignadas' },
    { title: 'Tareas Asignadas', value: data.tareasAsignadas || 0, icon: Target, color: 'text-primary', bgColor: 'bg-primary/10', sub: 'Directamente a mí' },
    { title: 'Tareas Vencidas', value: data.tareasVencidas, icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', sub: 'Requieren atención', valueColor: 'text-destructive' },
    { title: 'Completadas', value: data.tareasCompletadas, icon: CheckSquare, color: 'text-success', bgColor: 'bg-success/10', sub: `De ${data.totalTareas} totales`, valueColor: 'text-success' },
  ] : [
    { title: 'Tareas Pendientes', value: data.tareasPendientes, icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', sub: 'En progreso o pendientes' },
    { title: 'Completadas', value: data.tareasCompletadas, icon: CheckSquare, color: 'text-success', bgColor: 'bg-success/10', sub: `De ${data.totalTareas} totales`, valueColor: 'text-success' },
    { title: 'Docs. por Vencer', value: data.documentosPorVencer || 0, icon: FileText, color: 'text-warning', bgColor: 'bg-warning/10', sub: 'Próximos 30 días' },
    { title: 'Solicitudes', value: data.solicitudesPendientes || 0, icon: AlertCircle, color: 'text-primary', bgColor: 'bg-primary/10', sub: 'Pendientes de respuesta' },
  ];

  return (
    <DashboardLayout currentPage="/dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground font-body mt-1">
              Aquí tienes un resumen de tu actividad
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setCreateSheetOpen(true)} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Nueva Tarea
            </Button>
            {role !== 'cliente' && (
              <Button onClick={() => navigate('/empresas')} variant="outline" size="sm" className="gap-1.5">
                <Building2 className="w-4 h-4" /> Empresas
              </Button>
            )}
            <Button onClick={() => navigate('/calendario')} variant="outline" size="sm" className="gap-1.5">
              <Calendar className="w-4 h-4" /> Calendario
            </Button>
          </div>
        </div>

        {/* Agenda del día */}
        {(role === 'administrador' || role === 'consultor') && <AgendaHoy />}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className="gradient-card shadow-elegant hover:shadow-card transition-smooth hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium">{kpi.title}</CardTitle>
                  <div className={`${kpi.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-heading font-bold ${(kpi as any).valueColor || ''}`}>{kpi.value}</div>
                  <p className="text-xs text-muted-foreground font-body mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        {role === 'administrador' && <AdminAnalytics data={data} />}
        {role === 'consultor' && <ConsultorAnalytics data={data} />}
        {role === 'cliente' && <ClienteAnalytics data={data} />}

        {/* Obligaciones + Semáforo */}
        {(role === 'administrador' || role === 'consultor') && (
          <>
            <DashboardObligaciones />
            <EmpresaComplianceSemaforo />
          </>
        )}

        {/* Tareas + Mensajes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Próximas Tareas
                  </CardTitle>
                  <CardDescription className="font-body">
                    Próximas 10 tareas por vencer
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/tareas')} className="font-heading">
                  Ver Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.proximasTareas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="w-10 h-10 text-success/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">¡Excelente! No hay tareas próximas a vencer</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {data.proximasTareas.map((tarea) => (
                    <div
                      key={tarea.id}
                      className="border rounded-lg p-3 hover:border-primary transition-colors cursor-pointer group"
                      onClick={() => { setSelectedTareaId(tarea.id); setDetailSheetOpen(true); }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-heading font-medium text-sm truncate">{tarea.titulo}</span>
                            <Badge className={getPrioridadColor(tarea.prioridad)} variant="secondary">
                              {tarea.prioridad}
                            </Badge>
                            <Badge className={getEstadoColor(tarea.estado)}>
                              {estadoLabels[tarea.estado] || tarea.estado}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {tarea.empresa_nombre && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> {tarea.empresa_nombre}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {format(new Date(tarea.fecha_vencimiento), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </div>
                        {tarea.estado !== 'completada' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-success hover:text-success hover:bg-success/10"
                            onClick={(e) => handleQuickComplete(e, tarea.id)}
                            title="Marcar como completada"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DashboardMensajes mensajes={data.mensajesRecientes} totalNoLeidos={data.mensajesNoLeidos} />
        </div>

        {/* Calendario */}
        <DashboardCalendar
          height="500px"
          onEventClick={(event) => {
            if (event.resource.type === 'tarea') {
              setSelectedTareaId(event.resource.data.id);
              setDetailSheetOpen(true);
            } else if (event.resource.type === 'documento') {
              navigate(`/empresas/${event.resource.data.empresa_id}`);
            }
          }}
        />
      </div>

      <CreateTareaSheet
        open={createSheetOpen}
        onOpenChange={setCreateSheetOpen}
        onTareaCreated={() => refetch()}
      />

      {selectedTareaId && (
        <TareaDetailSheet
          open={detailSheetOpen}
          onOpenChange={(open) => { setDetailSheetOpen(open); if (!open) { setSelectedTareaId(null); refetch(); } }}
          tareaId={selectedTareaId}
          onUpdate={() => refetch()}
        />
      )}
    </DashboardLayout>
  );
}
