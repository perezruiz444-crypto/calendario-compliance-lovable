import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertCircle, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface DependenciasManagerProps {
  tareaId: string;
}

export function DependenciasManager({ tareaId }: DependenciasManagerProps) {
  const [dependencias, setDependencias] = useState<any[]>([]);
  const [bloqueadoPor, setBloqueadoPor] = useState<any[]>([]);
  const [disponiblesTareas, setDisponiblesTareas] = useState<any[]>([]);
  const [selectedTarea, setSelectedTarea] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    fetchDependencias();
    fetchTareasDisponibles();
    checkIfBlocked();
  }, [tareaId]);

  const fetchDependencias = async () => {
    try {
      // Tareas que dependen de esta (esta tarea bloquea a otras)
      const { data: deps, error: depsError } = await supabase
        .from('tarea_dependencias')
        .select(`
          id,
          tipo,
          tareas:tarea_id(id, titulo, estado)
        `)
        .eq('depende_de_tarea_id', tareaId);

      if (depsError) throw depsError;
      setDependencias(deps || []);

      // Tareas de las que depende esta (esta tarea está bloqueada por)
      const { data: blocked, error: blockedError } = await supabase
        .from('tarea_dependencias')
        .select(`
          id,
          tipo,
          tareas:depende_de_tarea_id(id, titulo, estado)
        `)
        .eq('tarea_id', tareaId);

      if (blockedError) throw blockedError;
      setBloqueadoPor(blocked || []);
    } catch (error) {
      console.error('Error fetching dependencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTareasDisponibles = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select('id, titulo, estado')
        .neq('id', tareaId)
        .order('titulo');

      if (error) throw error;
      setDisponiblesTareas(data || []);
    } catch (error) {
      console.error('Error fetching tareas:', error);
    }
  };

  const checkIfBlocked = async () => {
    try {
      const { data, error } = await supabase
        .rpc('is_tarea_blocked', { p_tarea_id: tareaId });

      if (error) throw error;
      setIsBlocked(data);
    } catch (error) {
      console.error('Error checking if blocked:', error);
    }
  };

  const handleAdd = async () => {
    if (!selectedTarea) return;

    try {
      const { error } = await supabase
        .from('tarea_dependencias')
        .insert({
          tarea_id: tareaId,
          depende_de_tarea_id: selectedTarea,
          tipo: 'finish_to_start'
        });

      if (error) throw error;
      
      setSelectedTarea('');
      fetchDependencias();
      checkIfBlocked();
      toast.success('Dependencia agregada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tarea_dependencias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDependencias();
      checkIfBlocked();
      toast.success('Dependencia eliminada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getEstadoColor = (estado: string) => {
    return estado === 'completada' ? 'default' : 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Dependencias
        </CardTitle>
        <CardDescription>
          Gestiona qué tareas deben completarse antes
        </CardDescription>
        {isBlocked && (
          <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning rounded text-sm">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-warning">Esta tarea está bloqueada por otras pendientes</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new dependency */}
        <div className="flex gap-2">
          <Select value={selectedTarea} onValueChange={setSelectedTarea}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona una tarea..." />
            </SelectTrigger>
            <SelectContent>
              {disponiblesTareas
                .filter(t => !bloqueadoPor.some(b => b.tareas?.id === t.id))
                .map((tarea) => (
                  <SelectItem key={tarea.id} value={tarea.id}>
                    {tarea.titulo}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} size="sm" disabled={!selectedTarea}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </div>

        {/* Bloqueada por */}
        {bloqueadoPor.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Bloqueada por:</h4>
            {bloqueadoPor.map((dep) => (
              <div key={dep.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2 flex-1">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{dep.tareas?.titulo}</span>
                  <Badge variant={getEstadoColor(dep.tareas?.estado)}>
                    {dep.tareas?.estado}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(dep.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Bloquea a */}
        {dependencias.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Esta tarea bloquea a:</h4>
            {dependencias.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 p-2 border rounded bg-accent/20">
                <Link2 className="w-4 h-4 text-primary" />
                <span className="text-sm flex-1">{dep.tareas?.titulo}</span>
                <Badge variant="outline">{dep.tareas?.estado}</Badge>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        )}

        {!loading && bloqueadoPor.length === 0 && dependencias.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay dependencias configuradas</p>
            <p className="text-xs mt-1">Agrega tareas que deben completarse primero</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}