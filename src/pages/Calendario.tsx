import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Clock, Building2 } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';

export default function Calendario() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTareas();
    }
  }, [user]);

  const fetchTareas = async () => {
    setLoadingTareas(true);
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select(`
          *,
          empresas(razon_social),
          profiles:consultor_asignado_id(nombre_completo),
          categorias_tareas(nombre, color)
        `)
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      setTareas(data || []);
    } catch (error) {
      console.error('Error fetching tareas:', error);
      toast.error('Error al cargar tareas');
    } finally {
      setLoadingTareas(false);
    }
  };

  const getTareasForDate = (date: Date) => {
    return tareas.filter(tarea => {
      if (!tarea.fecha_vencimiento) return false;
      return isSameDay(parseISO(tarea.fecha_vencimiento), date);
    });
  };

  const selectedDateTareas = selectedDate ? getTareasForDate(selectedDate) : [];

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

  // Get dates with tasks for calendar highlighting
  const datesWithTasks = tareas
    .filter(t => t.fecha_vencimiento)
    .map(t => parseISO(t.fecha_vencimiento));

  const modifiers = {
    hasTasks: datesWithTasks
  };

  const modifiersClassNames = {
    hasTasks: 'bg-primary/20 font-bold'
  };

  if (loading || loadingTareas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/calendario">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Calendario de Tareas
          </h1>
          <p className="text-muted-foreground font-body">
            Vista global de todas las tareas con fecha de vencimiento
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Calendario
              </CardTitle>
              <CardDescription className="font-body">
                Los días marcados tienen tareas programadas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="rounded-md border pointer-events-auto"
              />
            </CardContent>
          </Card>

          {/* Tasks for Selected Date */}
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {selectedDate && format(selectedDate, 'dd/MM/yyyy')}
              </CardTitle>
              <CardDescription className="font-body">
                {selectedDateTareas.length} tarea(s) para este día
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDateTareas.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground font-body text-sm">
                    No hay tareas para este día
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateTareas.map((tarea) => (
                    <div
                      key={tarea.id}
                      className="border rounded-lg p-3 hover:border-primary transition-colors cursor-pointer hover-scale animate-fade-in"
                      onClick={() => navigate('/tareas')}
                    >
                      <div className="space-y-2">
                        <h4 className="font-heading font-semibold text-sm line-clamp-1">
                          {tarea.titulo}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {tarea.categorias_tareas && (
                            <Badge
                              variant="outline"
                              className="gap-1 text-xs"
                              style={{ borderColor: tarea.categorias_tareas.color }}
                            >
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: tarea.categorias_tareas.color }}
                              />
                              {tarea.categorias_tareas.nombre}
                            </Badge>
                          )}
                          <Badge className={`${getPrioridadColor(tarea.prioridad)} text-xs`}>
                            {tarea.prioridad}
                          </Badge>
                          <Badge className={`${getEstadoColor(tarea.estado)} text-xs`}>
                            {estadoLabels[tarea.estado]}
                          </Badge>
                        </div>
                        {tarea.empresas && (
                          <p className="text-xs text-muted-foreground font-body flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {tarea.empresas.razon_social}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Tasks Summary */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Próximas Tareas</CardTitle>
            <CardDescription className="font-body">
              Todas las tareas con fecha de vencimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tareas.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-body">
                  No hay tareas con fecha de vencimiento
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tareas.slice(0, 10).map((tarea) => (
                  <div
                    key={tarea.id}
                    className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer hover-scale animate-fade-in"
                    onClick={() => navigate('/tareas')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-heading font-semibold">{tarea.titulo}</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          {tarea.categorias_tareas && (
                            <Badge
                              variant="outline"
                              className="gap-1"
                              style={{ borderColor: tarea.categorias_tareas.color }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: tarea.categorias_tareas.color }}
                              />
                              {tarea.categorias_tareas.nombre}
                            </Badge>
                          )}
                          <Badge className={getPrioridadColor(tarea.prioridad)}>
                            {tarea.prioridad}
                          </Badge>
                          <Badge className={getEstadoColor(tarea.estado)}>
                            {estadoLabels[tarea.estado]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                          {tarea.empresas && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {tarea.empresas.razon_social}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy')}
                          </span>
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
