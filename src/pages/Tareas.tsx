import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useTareasShortcuts } from '@/hooks/useKeyboardShortcuts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Plus, CheckSquare, MessageSquare, Settings, Repeat, Bell, Search, Filter, X, Building2, Calendar as CalendarIcon, AlertCircle, Paperclip, User, LayoutGrid, List, Calendar as CalendarViewIcon, Trash2, Zap, ClipboardList, GanttChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreateTareaSheet from '@/components/tareas/CreateTareaSheet';

import TareaDetailSheet from '@/components/tareas/TareaDetailSheet';
import ManageCategoriesDialog from '@/components/tareas/ManageCategoriesDialog';
import ManageCustomFields from '@/components/tareas/ManageCustomFields';
import ManageTemplates from '@/components/tareas/ManageTemplates';
import { ManageAutomations } from '@/components/tareas/ManageAutomations';
import { TareasTimeline } from '@/components/tareas/TareasTimeline';
import { ObligacionesActivasTab } from '@/components/obligaciones/ObligacionesActivasTab';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Checkbox } from '@/components/ui/checkbox';
import SendNotificationDialog from '@/components/tareas/SendNotificationDialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper Components
interface TareaCardProps {
  tarea: any;
  onClick: () => void;
  getPrioridadColor: (prioridad: string) => string;
  getEstadoColor: (estado: string) => string;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  isOverdue: (fecha: string) => boolean;
  formatDate: (fecha: string) => string;
  prioridadLabels: { [key: string]: string };
  estadoLabels: { [key: string]: string };
  isDragging?: boolean;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

function TareaCard({ 
  tarea, 
  onClick, 
  getPrioridadColor, 
  getEstadoColor, 
  getInitials, 
  getAvatarColor, 
  isOverdue, 
  formatDate, 
  prioridadLabels, 
  estadoLabels,
  isDragging = false,
  showCheckbox = false,
  isSelected = false,
  onSelect
}: TareaCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative p-5 border rounded-lg hover:shadow-md hover:scale-[1.01] cursor-pointer transition-all bg-card',
        'transition-all duration-150',
        isDragging && 'scale-[0.98] shadow-lg rotate-1 opacity-75 cursor-grabbing',
        isSelected && 'ring-2 ring-primary'
      )}
      style={{
        borderLeft: `3px solid ${
          tarea.prioridad === 'urgente' ? 'hsl(var(--destructive))' :
          tarea.prioridad === 'alta' ? 'hsl(25, 95%, 53%)' :
          tarea.prioridad === 'media' ? 'hsl(var(--warning))' :
          'hsl(var(--success))'
        }`
      }}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        {showCheckbox && (
          <div className="flex-shrink-0 mt-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.(tarea.id)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {tarea.consultor_profile ? (
            <Avatar className="h-10 w-10">
              <AvatarFallback 
                style={{ backgroundColor: getAvatarColor(tarea.consultor_profile.nombre_completo) }}
                className="text-primary-foreground text-xs font-medium"
              >
                {getInitials(tarea.consultor_profile.nombre_completo)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Priority */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-heading font-semibold text-lg text-foreground line-clamp-1">
              {tarea.titulo}
            </h3>
            <Badge className={`${getPrioridadColor(tarea.prioridad)} flex-shrink-0`}>
              {prioridadLabels[tarea.prioridad]}
            </Badge>
          </div>

          {/* Description */}
          {tarea.descripcion && (
            <p className="text-sm font-body text-muted-foreground mb-3 line-clamp-2">
              {tarea.descripcion}
            </p>
          )}

          {/* Metadata Row 1: Category and Status */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {tarea.categorias_tareas && (
              <Badge
                variant="outline"
                className="text-xs gap-1.5"
                style={{ borderColor: tarea.categorias_tareas.color }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tarea.categorias_tareas.color }}
                />
                {tarea.categorias_tareas.nombre}
              </Badge>
            )}
            <Badge className={`text-xs ${getEstadoColor(tarea.estado)}`}>
              {estadoLabels[tarea.estado]}
            </Badge>
            {tarea.es_recurrente && (
              <Badge variant="outline" className="text-xs">
                <Repeat className="w-3 h-3 mr-1" />
                Recurrente
              </Badge>
            )}
          </div>

          {/* Metadata Row 2: Company, Date, Comments, Attachments */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {tarea.empresas && (
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {tarea.empresas.razon_social}
              </span>
            )}
            {tarea.fecha_vencimiento && (
              <span className={`flex items-center gap-1.5 ${isOverdue(tarea.fecha_vencimiento) ? 'text-destructive font-medium' : ''}`}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {formatDate(tarea.fecha_vencimiento)}
                {isOverdue(tarea.fecha_vencimiento) && (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </span>
            )}
            {tarea.archivos_adjuntos && tarea.archivos_adjuntos.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                {tarea.archivos_adjuntos.length}
              </span>
            )}
            {!tarea.consultor_profile && (
              <Badge variant="outline" className="text-xs">
                Sin asignar
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableTareaCard(props: TareaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.tarea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TareaCard {...props} isDragging={isDragging} />
    </div>
  );
}

function EmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-lg mb-2">
        No se encontraron tareas
      </h3>
      <p className="text-sm text-muted-foreground font-body">
        {hasActiveFilters 
          ? 'Intenta ajustar los filtros para ver más resultados'
          : 'No hay tareas creadas aún'}
      </p>
    </div>
  );
}

interface KanbanColumnProps {
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
  tareas: any[];
  estadoLabels: { [key: string]: string };
  getEstadoColor: (estado: string) => string;
  onTareaClick: (tareaId: string) => void;
  getPrioridadColor: (prioridad: string) => string;
  getInitials: (name: string) => string;
  getAvatarColor: (name: string) => string;
  isOverdue: (fecha: string) => boolean;
  formatDate: (fecha: string) => string;
  prioridadLabels: { [key: string]: string };
}

function KanbanColumn({
  estado,
  tareas,
  estadoLabels,
  getEstadoColor,
  onTareaClick,
  getPrioridadColor,
  getInitials,
  getAvatarColor,
  isOverdue,
  formatDate,
  prioridadLabels,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: estado });

  return (
    <div ref={setNodeRef} className="flex flex-col h-full min-h-[600px]">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading font-medium flex items-center gap-2">
              <Badge className={getEstadoColor(estado)}>
                {estadoLabels[estado]}
              </Badge>
              <span className="text-muted-foreground">({tareas.length})</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <SortableContext items={tareas.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tareas.map((tarea) => (
                <SortableTareaCard
                  key={tarea.id}
                  tarea={tarea}
                  onClick={() => onTareaClick(tarea.id)}
                  getPrioridadColor={getPrioridadColor}
                  getEstadoColor={getEstadoColor}
                  getInitials={getInitials}
                  getAvatarColor={getAvatarColor}
                  isOverdue={isOverdue}
                  formatDate={formatDate}
                  prioridadLabels={prioridadLabels}
                  estadoLabels={estadoLabels}
                />
              ))}
              {tareas.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No hay tareas
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
}


export default function Tareas() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useTareasShortcuts({
    onQuickCreate: () => setDialogOpen(true),
    onSearch: () => searchInputRef.current?.focus(),
    onListView: () => setViewMode('list'),
    onKanbanView: () => setViewMode('kanban'),
    onCalendarView: () => setViewMode('calendar')
  });
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingTareas, setLoadingTareas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [customFieldsDialogOpen, setCustomFieldsDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [automationsDialogOpen, setAutomationsDialogOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);
  const [selectedConsultor, setSelectedConsultor] = useState<string>('');
  const [consultores, setConsultores] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('all');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterConsultor, setFilterConsultor] = useState<string>('all');
  
  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar' | 'timeline' | 'obligaciones'>('list');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Bulk selection
  const [selectedTareas, setSelectedTareas] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && role) {
      fetchConsultores();
      fetchEmpresas();
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

  const fetchTareas = async () => {
    setLoadingTareas(true);
    try {
      let query = supabase
        .from('tareas')
        .select(`
          *,
          empresas(razon_social),
          categorias_tareas(nombre, color)
        `)
        .order('created_at', { ascending: false });

      // Filter by selected empresa from context
      if (selectedEmpresaId && selectedEmpresaId !== 'all') {
        query = query.eq('empresa_id', selectedEmpresaId);
      }

      const { data: tareasData, error } = await query;

      if (error) throw error;

      // Fetch consultant profiles separately
      if (tareasData && tareasData.length > 0) {
        const consultorIds = tareasData
          .map(t => t.consultor_asignado_id)
          .filter(id => id != null);

        if (consultorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, nombre_completo')
            .in('id', consultorIds);

          // Map profiles to tareas
          const tareasWithProfiles = tareasData.map(tarea => ({
            ...tarea,
            consultor_profile: profilesData?.find(p => p.id === tarea.consultor_asignado_id)
          }));

          setTareas(tareasWithProfiles);
        } else {
          setTareas(tareasData);
        }
      } else {
        setTareas([]);
      }
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
  }, [user, selectedEmpresaId]);

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
    if (!selectedConsultor) {
      toast({
        title: "Selecciona un consultor",
        description: "Primero debes seleccionar un consultor de la lista para enviarle recordatorios de sus tareas pendientes",
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

  const prioridadLabels: { [key: string]: string } = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente'
  };

  // Función para obtener tareas filtradas
  const getFilteredTareas = () => {
    return tareas.filter(tarea => {
      // Filtro de búsqueda
      const matchesSearch = searchQuery === '' || 
        tarea.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tarea.descripcion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tarea.empresas?.razon_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tarea.consultor_profile?.nombre_completo.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro de estado
      const matchesEstado = filterEstado === 'all' || tarea.estado === filterEstado;

      // Filtro de prioridad
      const matchesPrioridad = filterPrioridad === 'all' || tarea.prioridad === filterPrioridad;

      // Filtro de empresa
      const matchesEmpresa = filterEmpresa === 'all' || tarea.empresa_id === filterEmpresa;

      // Filtro de consultor
      const matchesConsultor = filterConsultor === 'all' || 
        (filterConsultor === 'sin_asignar' && !tarea.consultor_asignado_id) ||
        tarea.consultor_asignado_id === filterConsultor;

      return matchesSearch && matchesEstado && matchesPrioridad && matchesEmpresa && matchesConsultor;
    });
  };

  const hasActiveFilters = searchQuery !== '' || filterEstado !== 'all' || 
    filterPrioridad !== 'all' || filterEmpresa !== 'all' || filterConsultor !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterEstado('all');
    setFilterPrioridad('all');
    setFilterEmpresa('all');
    setFilterConsultor('all');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(221, 83%, 53%)',
      'hsl(340, 82%, 52%)',
      'hsl(291, 47%, 51%)',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const isOverdue = (fecha: string) => {
    if (!fecha) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(fecha);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const formatDate = (fecha: string) => {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;
    
    const tareaId = active.id as string;
    const validEstados = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
    
    // Resolve the target estado - over.id could be a column ID or a task ID
    let newEstado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
    if (validEstados.includes(over.id as string)) {
      newEstado = over.id as 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
    } else {
      // Dropped on another task card - find which column that task belongs to
      const targetTarea = tareas.find(t => t.id === over.id);
      if (!targetTarea) return;
      newEstado = targetTarea.estado as 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
    }

    // Find the task
    const tarea = tareas.find(t => t.id === tareaId);
    if (!tarea || tarea.estado === newEstado) return;

    // Optimistic update
    setTareas(prevTareas =>
      prevTareas.map(t =>
        t.id === tareaId ? { ...t, estado: newEstado } : t
      )
    );

    // Update in database
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ estado: newEstado })
        .eq('id', tareaId);

      if (error) throw error;

      toast({
        title: "Tarea actualizada",
        description: `Estado cambiado a ${estadoLabels[newEstado]}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert optimistic update
      fetchTareas();
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarea",
        variant: "destructive"
      });
    }
  };

  const handleDragStart = (event: DragEndEvent) => {
    setActiveDragId(event.active.id as string);
  };

  if (loadingTareas) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-[0.625rem] border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filteredTareas = getFilteredTareas();
  const tareasPendientes = filteredTareas.filter(t => t.estado === 'pendiente');
  const tareasEnProgreso = filteredTareas.filter(t => t.estado === 'en_progreso');
  const tareasCompletadas = filteredTareas.filter(t => t.estado === 'completada');
  const tareasCanceladas = filteredTareas.filter(t => t.estado === 'cancelada');

  // Totals for context
  const totalPendientes = tareas.filter(t => t.estado === 'pendiente').length;
  const totalEnProgreso = tareas.filter(t => t.estado === 'en_progreso').length;
  const totalCompletadas = tareas.filter(t => t.estado === 'completada').length;
  const totalCanceladas = tareas.filter(t => t.estado === 'cancelada').length;
  const hasFiltersApplied = filterEmpresa !== 'all' || filterConsultor !== 'all' || filterEstado !== 'all' || filterPrioridad !== 'all' || searchQuery !== '';

  // Bulk actions
  const handleSelectTarea = (tareaId: string) => {
    const newSelected = new Set(selectedTareas);
    if (newSelected.has(tareaId)) {
      newSelected.delete(tareaId);
    } else {
      newSelected.add(tareaId);
    }
    setSelectedTareas(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTareas.size === filteredTareas.length) {
      setSelectedTareas(new Set());
    } else {
      setSelectedTareas(new Set(filteredTareas.map(t => t.id)));
    }
  };

  const handleBulkUpdateEstado = async (newEstado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada') => {
    try {
      const updates = Array.from(selectedTareas).map(id =>
        supabase.from('tareas').update({ estado: newEstado }).eq('id', id)
      );
      
      await Promise.all(updates);
      
      toast({
        title: "Tareas actualizadas",
        description: `${selectedTareas.size} tareas actualizadas a ${newEstado}`,
      });
      
      setSelectedTareas(new Set());
      fetchTareas();
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las tareas",
        variant: "destructive"
      });
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedTareas.size} tareas seleccionadas?`)) return;
    
    try {
      const deletes = Array.from(selectedTareas).map(id =>
        supabase.from('tareas').delete().eq('id', id)
      );
      
      await Promise.all(deletes);
      
      toast({
        title: "Tareas eliminadas",
        description: `${selectedTareas.size} tareas eliminadas`,
      });
      
      setSelectedTareas(new Set());
      fetchTareas();
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las tareas",
        variant: "destructive"
      });
    }
  };

  // Calendar events
  const calendarEvents = filteredTareas
    .filter(t => t.fecha_vencimiento)
    .map(t => ({
      id: t.id,
      title: t.titulo,
      start: new Date(t.fecha_vencimiento),
      end: new Date(t.fecha_vencimiento),
      resource: t
    }));

  const handleSelectEvent = (event: any) => {
    setSelectedTareaId(event.id);
    setDetailDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
            {/* View Mode Toggle */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <List className="w-4 h-4 mr-1" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Kanban
              </Button>
               <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="h-8"
              >
                <CalendarViewIcon className="w-4 h-4 mr-1" />
                Calendario
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                className="h-8"
              >
                <GanttChart className="w-4 h-4 mr-1" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'obligaciones' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('obligaciones')}
                className="h-8"
              >
                <ClipboardList className="w-4 h-4 mr-1" />
                Obligaciones
              </Button>
            </div>
            
            {(role === 'administrador' || role === 'consultor') && (
              <>
                <Button onClick={() => setCustomFieldsDialogOpen(true)} variant="outline" className="font-heading">
                  <Settings className="w-4 h-4 mr-2" />
                  Campos
                </Button>
                <Button onClick={() => setTemplatesDialogOpen(true)} variant="outline" className="font-heading">
                  <Settings className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <Button onClick={() => setAutomationsDialogOpen(true)} variant="outline" className="font-heading">
                  <Zap className="w-4 h-4 mr-2" />
                  Automatizaciones
                </Button>
                <Button onClick={() => setDialogOpen(true)} className="font-heading gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Tarea
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="gradient-card shadow-card">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar tareas (Ctrl+F)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Estado
                  </label>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En Progreso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Prioridad
                  </label>
                  <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Empresa
                  </label>
                  <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {empresas.map(empresa => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Consultor
                  </label>
                  <Select value={filterConsultor} onValueChange={setFilterConsultor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sin_asignar">Sin Asignar</SelectItem>
                      {consultores.map(consultor => (
                        <SelectItem key={consultor.id} value={consultor.id}>
                          {consultor.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                    Seleccionar Consultor *
                  </label>
                  <Select value={selectedConsultor} onValueChange={setSelectedConsultor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige un consultor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {consultores.map(consultor => (
                        <SelectItem key={consultor.id} value={consultor.id}>
                          {consultor.nombre_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Selecciona un consultor para enviarle recordatorios de sus tareas pendientes
                  </p>
                </div>
                <Button onClick={handleSendBulkNotification} disabled={!selectedConsultor}>
                  <Bell className="w-4 h-4 mr-2" />
                  Enviar Recordatorio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="gradient-card shadow-card hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setFilterEstado('pendiente')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                Pendientes
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground group-hover:text-warning transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasPendientes.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                {hasFiltersApplied ? `de ${totalPendientes} total` : 'Tareas por iniciar'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="gradient-card shadow-card hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setFilterEstado('en_progreso')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                En Progreso
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasEnProgreso.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                {hasFiltersApplied ? `de ${totalEnProgreso} total` : 'En desarrollo'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="gradient-card shadow-card hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setFilterEstado('completada')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                Completadas
              </CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground group-hover:text-success transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasCompletadas.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                {hasFiltersApplied ? `de ${totalCompletadas} total` : 'Finalizadas'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="gradient-card shadow-card hover:shadow-lg transition-all cursor-pointer group"
            onClick={() => setFilterEstado('cancelada')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-heading font-medium">
                Canceladas
              </CardTitle>
              <X className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{tareasCanceladas.length}</div>
              <p className="text-xs font-body text-muted-foreground">
                {hasFiltersApplied ? `de ${totalCanceladas} total` : 'Descartadas'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tareas View - List, Kanban, Calendar, Timeline or Obligaciones */}
        <div key={viewMode} className="animate-fade-up">
        {viewMode === 'timeline' ? (
          <TareasTimeline
            tareas={filteredTareas}
            onTareaClick={(id) => { setSelectedTareaId(id); setDetailDialogOpen(true); }}
          />
        ) : viewMode === 'obligaciones' ? (
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Obligaciones Activas
              </CardTitle>
              <CardDescription className="font-body">
                Obligaciones legales activadas como pendientes de cumplimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ObligacionesActivasTab />
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-heading">Todas las Tareas</CardTitle>
                  <CardDescription className="font-body">
                    {filteredTareas.length} de {tareas.length} tareas
                  </CardDescription>
                </div>
                {filteredTareas.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedTareas.size === filteredTareas.length && selectedTareas.size > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      Seleccionar todas
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Bulk Actions Toolbar */}
              {selectedTareas.size > 0 && (
                <Card className="mb-4 bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <span className="text-sm font-medium">
                        {selectedTareas.size} tarea(s) seleccionada(s)
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        <Select onValueChange={handleBulkUpdateEstado}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Cambiar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_progreso">En Progreso</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTareas(new Set())}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {filteredTareas.map((tarea) => (
                  <TareaCard
                    key={tarea.id}
                    tarea={tarea}
                    onClick={() => handleTareaClick(tarea.id)}
                    getPrioridadColor={getPrioridadColor}
                    getEstadoColor={getEstadoColor}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                    isOverdue={isOverdue}
                    formatDate={formatDate}
                    prioridadLabels={prioridadLabels}
                    estadoLabels={estadoLabels}
                    showCheckbox={true}
                    isSelected={selectedTareas.has(tarea.id)}
                    onSelect={handleSelectTarea}
                  />
                ))}
                {filteredTareas.length === 0 && (
                  <EmptyState hasActiveFilters={hasActiveFilters} />
                )}
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'calendar' ? (
          <Card className="gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="font-heading">Calendario de Tareas</CardTitle>
              <CardDescription className="font-body">
                Vista de tareas por fecha de vencimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <FullCalendar
                  plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
                  locale={esLocale}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,listMonth'
                  }}
                  buttonText={{ today: 'Hoy', month: 'Mes', listMonth: 'Agenda' }}
                  events={calendarEvents.map(e => ({
                    title: e.title,
                    start: e.start,
                    end: e.end,
                    extendedProps: { resource: e.resource },
                  }))}
                  eventClick={(info) => {
                    const tarea = info.event.extendedProps?.resource;
                    if (tarea) handleSelectEvent({ resource: tarea });
                  }}
                  height="100%"
                  dayMaxEvents={3}
                  moreLinkText={n => `+${n} más`}
                  nowIndicator
                  eventDisplay="block"
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(['pendiente', 'en_progreso', 'completada', 'cancelada'] as const).map((estado) => (
                <KanbanColumn
                  key={estado}
                  estado={estado}
                  tareas={filteredTareas.filter(t => t.estado === estado)}
                  estadoLabels={estadoLabels}
                  getEstadoColor={getEstadoColor}
                  onTareaClick={handleTareaClick}
                  getPrioridadColor={getPrioridadColor}
                  getInitials={getInitials}
                  getAvatarColor={getAvatarColor}
                  isOverdue={isOverdue}
                  formatDate={formatDate}
                  prioridadLabels={prioridadLabels}
                />
              ))}
            </div>
            <DragOverlay>
              {activeDragId && tareas.find(t => t.id === activeDragId) ? (
                <div className="opacity-50">
                  <TareaCard
                    tarea={tareas.find(t => t.id === activeDragId)!}
                    onClick={() => {}}
                    getPrioridadColor={getPrioridadColor}
                    getEstadoColor={getEstadoColor}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                    isOverdue={isOverdue}
                    formatDate={formatDate}
                    prioridadLabels={prioridadLabels}
                    estadoLabels={estadoLabels}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
        </div>
      </div>

      <CreateTareaSheet
        open={dialogOpen} 
        onOpenChange={handleDialogClose}
        onTareaCreated={fetchTareas}
      />
      {selectedTareaId && (
        <TareaDetailSheet
          open={detailDialogOpen}
          onOpenChange={handleDetailDialogClose}
          tareaId={selectedTareaId}
          onUpdate={fetchTareas}
        />
      )}
      <ManageCategoriesDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />
      <ManageCustomFields
        open={customFieldsDialogOpen}
        onOpenChange={setCustomFieldsDialogOpen}
      />
      <ManageTemplates
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
      />
      <Dialog open={automationsDialogOpen} onOpenChange={setAutomationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <ManageAutomations />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
