import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckSquare, MessageSquare, Settings, Repeat, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreateTareaDialog from '@/components/tareas/CreateTareaDialog';
import TareaDetailDialog from '@/components/tareas/TareaDetailDialog';
import ManageCategoriesDialog from '@/components/tareas/ManageCategoriesDialog';
import SendNotificationDialog from '@/components/tareas/SendNotificationDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function Tareas() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);
  const [selectedConsultor, setSelectedConsultor] = useState<string>('todos');
  const [consultores, setConsultores] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      fetchConsultores();
    }
  }, [user, role]);

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

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      fetchTareas();
    }
  };

  const handleDetailDialogClose = (open: boolean) => {
    setDetailDialogOpen(open);
    if (!open) {
      fetchTareas();
      setSelectedTareaId(null);
    }
  };

  const handleTareaClick = (tareaId: string) => {
    setSelectedTareaId(tareaId);
    setDetailDialogOpen(true);
  };

  const handleSendBulkNotification = async () => {
    if (selectedConsultor === 'todos') {
      toast({
        title: "Selecciona un consultor",
        description: "Debes seleccionar un consultor específico para enviar notificaciones",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-task-notifications', {
        body: {
          consultorId: selectedConsultor,
          type: 'reminder'
        }
      });

      if (error) throw error;

      toast({
        title: "Notificaciones enviadas",
        description: data?.message || "Las notificaciones han sido enviadas exitosamente"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'baja': return 'bg-success text-success-foreground';
      case 'media': return 'bg-warning text-warning-foreground';
      case 'alta': return 'bg-destructive text-destructive-foreground';
      case 'urgente': return 'bg-destructive text-destructive-foreground animate-pulse';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-warning text-warning-foreground';
      case 'en_progreso': return 'bg-primary text-primary-foreground';
      case 'completada': return 'bg-success text-success-foreground';
      case 'cancelada': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const estadoLabels: { [key: string]: string } = {
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada'
  };

  if (loading || loadingTareas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tareasPendientes = tareas.filter(t => t.estado === 'pendiente');
  const tareasEnProgreso = tareas.filter(t => t.estado === 'en_progreso');
  const tareasCompletadas = tareas.filter(t => t.estado === 'completada');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Tareas
            </h1>
            <p className="text-muted-foreground font-body">
              Gestiona y da seguimiento a las tareas del equipo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(role === 'administrador' || role === 'consultor') && (
              <>
                <Button onClick={() => setCategoriesDialogOpen(true)} variant="outline" className="font-heading">
                  <Settings className="w-4 h-4 mr-2" />
                  Categorías
                </Button>
                <Button onClick={() => setDialogOpen(true)} className="font-heading">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Tarea
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bulk notification section for admins/consultores */}
        {(role === 'administrador' || role === 'consultor') && (
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificaciones Masivas
              </CardTitle>
              <CardDescription className="font-body">
                Envía recordatorios de tareas pendientes por email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-heading font-medium mb-2 block">
                    Seleccionar Consultor
                  </label>
                  <Select value={selectedConsultor} onValueChange={setSelectedConsultor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los consultores</SelectItem>
                      {consultores.map(consultor => (
                        <SelectItem key={consultor.id} value={consultor.id}>
                          {consultor.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSendBulkNotification} disabled={selectedConsultor === 'todos'}>
                  <Bell className="w-4 h-4 mr-2" />
                  Enviar Recordatorio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                Pendientes
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasPendientes.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                Tareas por iniciar
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                En Progreso
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasEnProgreso.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                En desarrollo
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                Completadas
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasCompletadas.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                Finalizadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tareas List */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Todas las Tareas</CardTitle>
            <CardDescription className="font-body">
              Lista completa de tareas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tareas.map((tarea) => (
                <div
                  key={tarea.id}
                  onClick={() => handleTareaClick(tarea.id)}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-heading font-semibold">{tarea.titulo}</h3>
                      {tarea.es_recurrente && (
                        <Badge variant="outline" className="text-xs">
                          <Repeat className="w-3 h-3 mr-1" />
                          Recurrente
                        </Badge>
                      )}
                    </div>
                    {tarea.descripcion && (
                      <p className="text-sm font-body text-muted-foreground mb-2 line-clamp-2">
                        {tarea.descripcion}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {tarea.categorias_tareas && (
                        <Badge
                          variant="outline"
                          className="text-xs gap-1"
                          style={{ borderColor: tarea.categorias_tareas.color }}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tarea.categorias_tareas.color }}
                          />
                          {tarea.categorias_tareas.nombre}
                        </Badge>
                      )}
                      <Badge className={`text-xs ${getPrioridadColor(tarea.prioridad)}`}>
                        {tarea.prioridad}
                      </Badge>
                      <Badge className={`text-xs ${getEstadoColor(tarea.estado)}`}>
                        {estadoLabels[tarea.estado]}
                      </Badge>
                      {tarea.empresas && (
                        <span className="text-xs font-body text-muted-foreground">
                          {tarea.empresas.razon_social}
                        </span>
                      )}
                      {tarea.profiles && (
                        <span className="text-xs font-body text-muted-foreground">
                          Asignado a: {tarea.profiles.nombre_completo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {tareas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground font-body">
                  No hay tareas creadas aún
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTareaDialog 
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        onTareaCreated={fetchTareas}
      />
      {selectedTareaId && (
        <TareaDetailDialog
          open={detailDialogOpen}
          onOpenChange={handleDetailDialogClose}
          tareaId={selectedTareaId}
        />
      )}
      <ManageCategoriesDialog 
        open={categoriesDialogOpen} 
        onOpenChange={setCategoriesDialogOpen}
      />
    </DashboardLayout>
  );
}
