import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubtareasManagerProps {
  tareaId: string;
}

interface SortableSubtareaProps {
  subtarea: any;
  consultores: any[];
  onToggle: (id: string, completada: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, consultorId: string) => void;
  getInitials: (name: string) => string;
}

function SortableSubtarea({ subtarea, consultores, onToggle, onDelete, onAssign, getInitials }: SortableSubtareaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtarea.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 border rounded hover:bg-accent/50 transition-colors group ${isDragging ? 'shadow-lg bg-card' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted"
        tabIndex={-1}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      <Checkbox
        checked={subtarea.completada}
        onCheckedChange={() => onToggle(subtarea.id, subtarea.completada)}
      />

      <span className={`flex-1 text-sm ${subtarea.completada ? 'line-through text-muted-foreground' : ''}`}>
        {subtarea.titulo}
      </span>

      <Select
        value={subtarea.asignado_a || 'unassigned'}
        onValueChange={(value) => onAssign(subtarea.id, value === 'unassigned' ? '' : value)}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue>
            {subtarea.profiles ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {getInitials(subtarea.profiles.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{subtarea.profiles.nombre_completo}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Sin asignar</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Sin asignar</SelectItem>
          {consultores.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nombre_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(subtarea.id)}
        className="opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

export function SubtareasManager({ tareaId }: SubtareasManagerProps) {
  const [subtareas, setSubtareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubtarea, setNewSubtarea] = useState('');
  const [consultores, setConsultores] = useState<any[]>([]);
  const [progress, setProgress] = useState({ total: 0, completadas: 0, progreso: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchSubtareas();
    fetchConsultores();
  }, [tareaId]);

  const fetchSubtareas = async () => {
    try {
      const { data, error } = await supabase
        .from('subtareas')
        .select('*, profiles:asignado_a(nombre_completo)')
        .eq('tarea_id', tareaId)
        .order('orden');

      if (error) throw error;
      setSubtareas(data || []);

      const total = data?.length || 0;
      const completadas = data?.filter(s => s.completada).length || 0;
      const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
      setProgress({ total, completadas, progreso });
    } catch (error) {
      console.error('Error fetching subtareas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultores = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      const consultorIds = rolesData?.map(r => r.user_id) || [];
      if (consultorIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorIds);
        setConsultores(data || []);
      }
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const handleAdd = async () => {
    if (!newSubtarea.trim()) return;
    try {
      const { error } = await supabase
        .from('subtareas')
        .insert({ tarea_id: tareaId, titulo: newSubtarea.trim(), orden: subtareas.length });
      if (error) throw error;
      setNewSubtarea('');
      fetchSubtareas();
      toast.success('Subtarea agregada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggle = async (id: string, completada: boolean) => {
    try {
      const { error } = await supabase
        .from('subtareas')
        .update({
          completada: !completada,
          fecha_completado: !completada ? new Date().toISOString() : null,
          completado_por: !completada ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
      fetchSubtareas();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('subtareas').delete().eq('id', id);
      if (error) throw error;
      fetchSubtareas();
      toast.success('Subtarea eliminada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAssign = async (id: string, consultorId: string) => {
    try {
      const { error } = await supabase
        .from('subtareas')
        .update({ asignado_a: consultorId || null })
        .eq('id', id);
      if (error) throw error;
      fetchSubtareas();
      toast.success('Asignación actualizada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subtareas.findIndex(s => s.id === active.id);
    const newIndex = subtareas.findIndex(s => s.id === over.id);

    const reordered = arrayMove(subtareas, oldIndex, newIndex);
    setSubtareas(reordered);

    // Persist new order
    try {
      const updates = reordered.map((s, i) =>
        supabase.from('subtareas').update({ orden: i }).eq('id', s.id)
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Error al reordenar');
      fetchSubtareas();
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading">Subtareas</CardTitle>
        <CardDescription>Divide esta tarea en pasos más pequeños</CardDescription>
        {progress.total > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-sm">
              <span>{progress.completadas} de {progress.total} completadas</span>
              <span className="font-medium">{progress.progreso}%</span>
            </div>
            <Progress value={progress.progreso} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nueva subtarea..."
            value={newSubtarea}
            onChange={(e) => setNewSubtarea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        ) : subtareas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay subtareas aún</p>
            <p className="text-xs mt-1">Agrega pasos para dividir esta tarea</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={subtareas.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {subtareas.map((subtarea) => (
                  <SortableSubtarea
                    key={subtarea.id}
                    subtarea={subtarea}
                    consultores={consultores}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onAssign={handleAssign}
                    getInitials={getInitials}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
