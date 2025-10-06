import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckSquare, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreateTareaDialog from '@/components/tareas/CreateTareaDialog';
import TareaDetailDialog from '@/components/tareas/TareaDetailDialog';
import { Badge } from '@/components/ui/badge';

export default function Tareas() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTareas(data || []);
    } catch (error) {
      console.error('Error fetching tareas:', error);
    } finally {
      setLoadingTareas(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTareas();
    }
  }, [user]);

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

  const stats = {
    pendiente: tareas.filter(t => t.estado === 'pendiente').length,
    en_progreso: tareas.filter(t => t.estado === 'en_progreso').length,
    completada: tareas.filter(t => t.estado === 'completada').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/tareas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Gestión de Tareas
            </h1>
            <p className="text-muted-foreground font-body">
              Administra y da seguimiento a las tareas
            </p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-warning">{stats.pendiente}</div>
              <p className="text-xs text-muted-foreground font-body mt-1">tareas pendientes</p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">En Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-primary">{stats.en_progreso}</div>
              <p className="text-xs text-muted-foreground font-body mt-1">en progreso</p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-success">{stats.completada}</div>
              <p className="text-xs text-muted-foreground font-body mt-1">completadas</p>
            </CardContent>
          </Card>
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Todas las Tareas</CardTitle>
            <CardDescription className="font-body">
              Lista completa de tareas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTareas ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tareas.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <CheckSquare className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground font-body mb-4">
                  No hay tareas registradas todavía
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="gradient-primary shadow-elegant font-heading"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Tarea
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {tareas.map((tarea) => (
                  <div 
                    key={tarea.id} 
                    className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer hover-scale"
                    onClick={() => {
                      setSelectedTareaId(tarea.id);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold text-lg">{tarea.titulo}</h3>
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
                        {tarea.descripcion && (
                          <p className="text-sm text-muted-foreground font-body line-clamp-2">
                            {tarea.descripcion}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                          <span>Empresa: {tarea.empresas?.razon_social}</span>
                          {tarea.profiles && (
                            <span>• Asignado a: {tarea.profiles.nombre_completo}</span>
                          )}
                          {tarea.fecha_vencimiento && (
                            <span>• Vence: {new Date(tarea.fecha_vencimiento).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-2 font-heading">
                        <MessageSquare className="w-4 h-4" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTareaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTareaCreated={fetchTareas}
      />

      {selectedTareaId && (
        <TareaDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          tareaId={selectedTareaId}
        />
      )}
    </DashboardLayout>
  );
}
