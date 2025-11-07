import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TimeTrackerProps {
  tareaId: string;
}

export function TimeTracker({ tareaId }: TimeTrackerProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    fetchEntries();
  }, [tareaId]);

  useEffect(() => {
    let interval: any;
    if (activeEntry) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeEntry.inicio).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, profiles:user_id(nombre_completo)')
        .eq('tarea_id', tareaId)
        .order('inicio', { ascending: false });

      if (error) throw error;
      
      const entries = data || [];
      setEntries(entries);
      
      // Check for active entry
      const active = entries.find(e => !e.fin);
      setActiveEntry(active || null);
      
      // Calculate total time
      const total = entries
        .filter(e => e.duracion_minutos)
        .reduce((sum, e) => sum + (e.duracion_minutos || 0), 0);
      setTotalTime(total);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('time_entries')
        .insert({
          tarea_id: tareaId,
          user_id: user.user?.id,
          inicio: new Date().toISOString()
        });

      if (error) throw error;
      
      fetchEntries();
      toast.success('Timer iniciado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          fin: new Date().toISOString()
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      
      setActiveEntry(null);
      setElapsedTime(0);
      fetchEntries();
      toast.success('Timer detenido');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
      toast.success('Registro eliminado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Tracking
        </CardTitle>
        <CardDescription>
          Rastrea el tiempo invertido en esta tarea
        </CardDescription>
        <div className="flex items-center justify-between pt-2">
          <div className="text-2xl font-bold font-mono">
            {activeEntry ? formatTime(elapsedTime) : '00:00:00'}
          </div>
          <Badge variant="outline" className="text-sm">
            Total: {formatMinutes(totalTime)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2">
          {!activeEntry ? (
            <Button onClick={handleStart} className="flex-1 gap-2">
              <Play className="w-4 h-4" />
              Iniciar Timer
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive" className="flex-1 gap-2">
              <Pause className="w-4 h-4" />
              Detener Timer
            </Button>
          )}
        </div>

        {/* Entries list */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay registros de tiempo aún</p>
            <p className="text-xs mt-1">Inicia el timer para rastrear tu trabajo</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Historial</h4>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 border rounded group hover:bg-accent/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {entry.profiles?.nombre_completo}
                    </span>
                    {!entry.fin && (
                      <Badge variant="default" className="text-xs animate-pulse">
                        En progreso
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.inicio), { 
                      addSuffix: true, 
                      locale: es 
                    })}
                    {entry.duracion_minutos && (
                      <span className="ml-2">• {formatMinutes(entry.duracion_minutos)}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100"
                  disabled={!entry.fin}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}