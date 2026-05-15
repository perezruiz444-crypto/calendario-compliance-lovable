import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, CheckSquare, Users, AlertCircle, AlertTriangle, TrendingUp, Calendar, Clock, Target, FileText, Plus, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import EmpresaComplianceSemaforo from '@/components/dashboard/EmpresaComplianceSemaforo';
import DashboardMensajes from '@/components/dashboard/DashboardMensajes';
import AdminAnalytics from '@/components/dashboard/AdminAnalytics';
import ConsultorAnalytics from '@/components/dashboard/ConsultorAnalytics';
import ClienteAnalytics from '@/components/dashboard/ClienteAnalytics';
import CreateTareaSheet from '@/components/tareas/CreateTareaSheet';
import TareaDetailSheet from '@/components/tareas/TareaDetailSheet';
import DashboardObligacionesMensuales from '@/components/dashboard/DashboardObligacionesMensuales';
import RenovacionesWidget from '@/components/dashboard/RenovacionesWidget';
import FeedbackModal from '@/components/dashboard/FeedbackModal';
import FeedbackResultsCard from '@/components/dashboard/FeedbackResultsCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

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

  // User is authenticated but has no role assigned
  if (!loading && user && !role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-6">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-heading text-xl font-semibold">Cuenta pendiente de activación</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Tu cuenta fue creada pero aún no tiene un rol asignado.
          Contacta al administrador del sistema.
        </p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
      </div>
    );
  }

  if (loading || analyticsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-[0.625rem] border bg-card space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-[0.625rem]" />
          <Skeleton className="h-64 w-full rounded-[0.625rem]" />
        </div>
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
    { title: 'Empresas Activas', value: data.totalEmpresas || 0, icon: Building2, tone: 'primary', sub: 'Total registradas' },
    { title: 'Total Usuarios', value: data.totalUsuarios || 0, icon: Users, tone: 'primary', sub: `${data.totalConsultores || 0} consultores` },
    { title: 'Tareas Vencidas', value: data.tareasVencidas, icon: AlertTriangle, tone: 'destructive', sub: 'Requieren atención' },
    { title: 'Tasa Cumplimiento', value: data.totalTareas > 0 ? Math.round((data.tareasCompletadas / data.totalTareas) * 100) : 0, suffix: '%', icon: TrendingUp, tone: 'success', sub: `${data.tareasCompletadas} completadas` },
  ] : role === 'consultor' ? [
    { title: 'Mis Empresas', value: data.misEmpresas || 0, icon: Building2, tone: 'primary', sub: 'Empresas asignadas' },
    { title: 'Tareas Asignadas', value: data.tareasAsignadas || 0, icon: Target, tone: 'primary', sub: 'Directamente a mí' },
    { title: 'Tareas Vencidas', value: data.tareasVencidas, icon: AlertTriangle, tone: 'destructive', sub: 'Requieren atención' },
    { title: 'Completadas', value: data.tareasCompletadas, icon: CheckSquare, tone: 'success', sub: `De ${data.totalTareas} totales` },
  ] : [
    { title: 'Tareas Pendientes', value: data.tareasPendientes, icon: Clock, tone: 'warning', sub: 'En progreso o pendientes' },
    { title: 'Completadas', value: data.tareasCompletadas, icon: CheckSquare, tone: 'success', sub: `De ${data.totalTareas} totales` },
    { title: 'Docs. por Vencer', value: data.documentosPorVencer || 0, icon: FileText, tone: 'warning', sub: 'Próximos 30 días' },
    { title: 'Solicitudes', value: data.solicitudesPendientes || 0, icon: AlertCircle, tone: 'primary', sub: 'Pendientes de respuesta' },
  ];

  const toneClass: Record<string, { num: string; chip: string; accent: string }> = {
    primary:     { num: 'text-foreground',   chip: 'bg-primary/10 text-primary',         accent: 'card-accent-left' },
    destructive: { num: 'text-destructive',  chip: 'bg-destructive/10 text-destructive', accent: 'card-accent-danger' },
    success:     { num: 'text-success',      chip: 'bg-success/10 text-success',         accent: 'card-accent-success' },
    warning:     { num: 'text-warning',      chip: 'bg-warning/10 text-warning',         accent: 'card-accent-warning' },
  };

  return (
    <DashboardLayout currentPage="/dashboard">
      <div className="space-y-10">

        {/* ── Hero header editorial ── */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative overflow-hidden rounded-[var(--radius)] border border-border-subtle surface-mesh px-6 md:px-10 py-8 md:py-10"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 relative">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <p className="eyebrow-primary">{getGreeting()} · {format(new Date(), 'EEEE d \'de\' MMMM')}</p>
              </div>
              <h1 className="display-1 text-foreground">
                Hola, <span className="text-primary">{firstName}</span>.
              </h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Tu panorama de cumplimiento en un vistazo — obligaciones, tareas y empresas al día.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <Button onClick={() => setCreateSheetOpen(true)} size="sm" className="gap-1.5 shadow-editorial">
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
        </motion.header>

        {/* ── Banda hero de KPIs ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="eyebrow flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" /> Indicadores clave
            </p>
            <span className="text-[11px] text-muted-foreground font-mono">
              Actualizado {format(new Date(), 'HH:mm')}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, idx) => {
              const Icon = kpi.icon;
              const t = toneClass[kpi.tone];
              const numericValue = typeof kpi.value === 'number' ? kpi.value : parseInt(String(kpi.value)) || 0;
              const suffix = (kpi as any).suffix || '';
              return (
                <motion.div
                  key={kpi.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + idx * 0.06, ease: [0.4, 0, 0.2, 1] }}
                  className={`card-editorial ${t.accent} p-5 group`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="eyebrow text-[10px]">{kpi.title}</p>
                    <div className={`${t.chip} p-2 rounded-lg transition-transform group-hover:scale-110`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <AnimatedNumber
                      value={numericValue}
                      className={`font-heading text-4xl font-bold tracking-tight ${t.num}`}
                    />
                    {suffix && <span className={`font-heading text-2xl font-bold ${t.num}`}>{suffix}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{kpi.sub}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Flujo Operativo: Obligaciones del mes */}
        <DashboardObligacionesMensuales />

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

        {/* Panel de Supervisión y Análisis (Reportes y Semáforos) */}
        {(role === 'administrador' || role === 'consultor') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RenovacionesWidget />
            <EmpresaComplianceSemaforo />
          </div>
        )}

        {role === 'administrador' && <AdminAnalytics data={data} />}
        {role === 'consultor' && <ConsultorAnalytics data={data} />}
        {role === 'cliente' && <ClienteAnalytics data={data} />}

        {/* Customer Discovery Results - Admin only */}
        {role === 'administrador' && <FeedbackResultsCard />}
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

      {/* Feedback modal - obligatorio para clientes */}
      {role === 'cliente' && user && <FeedbackModal userId={user.id} />}
    </DashboardLayout>
  );
}
