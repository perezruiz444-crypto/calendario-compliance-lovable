import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Send, MessageSquare, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TareaDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: string;
}

export default function TareaDetailDialog({ open, onOpenChange, tareaId }: TareaDetailDialogProps) {
  const { user } = useAuth();
  const [tarea, setTarea] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open && tareaId) {
      fetchTareaData();
    }
  }, [open, tareaId]);

  const fetchTareaData = async () => {
    setLoadingData(true);
    try {
      // Fetch tarea
      const { data: tareaData, error: tareaError } = await supabase
        .from('tareas')
        .select(`
          *,
          empresas(razon_social),
          profiles:consultor_asignado_id(nombre_completo),
          creador:profiles!tareas_creado_por_fkey(nombre_completo)
        `)
        .eq('id', tareaId)
        .single();

      if (tareaError) throw tareaError;
      setTarea(tareaData);

      // Fetch comentarios
      const { data: comentariosData, error: comentariosError } = await supabase
        .from('comentarios')
        .select(`
          *,
          profiles(nombre_completo)
        `)
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: true });

      if (comentariosError) throw comentariosError;
      setComentarios(comentariosData || []);
    } catch (error: any) {
      toast.error('Error al cargar la tarea');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmitComentario = async () => {
    if (!nuevoComentario.trim()) {
      toast.error('El comentario no puede estar vacío');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comentarios')
        .insert({
          tarea_id: tareaId,
          user_id: user?.id,
          contenido: nuevoComentario.trim()
        });

      if (error) throw error;

      toast.success('Comentario agregado');
      setNuevoComentario('');
      fetchTareaData();
    } catch (error: any) {
      toast.error('Error al agregar comentario');
      console.error(error);
    } finally {
      setLoading(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tarea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl pr-8">{tarea.titulo}</DialogTitle>
          <DialogDescription className="font-body">
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={getPrioridadColor(tarea.prioridad)}>
                {tarea.prioridad}
              </Badge>
              <Badge className={getEstadoColor(tarea.estado)}>
                {estadoLabels[tarea.estado]}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span>{tarea.empresas?.razon_social}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Descripción */}
          {tarea.descripcion && (
            <div>
              <h3 className="font-heading font-semibold mb-2">Descripción</h3>
              <p className="font-body text-sm text-muted-foreground whitespace-pre-wrap">
                {tarea.descripcion}
              </p>
            </div>
          )}

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4">
            {tarea.profiles && (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-heading font-medium text-muted-foreground">Asignado a</p>
                  <p className="font-body text-sm">{tarea.profiles.nombre_completo}</p>
                </div>
              </div>
            )}
            {tarea.fecha_vencimiento && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-heading font-medium text-muted-foreground">Vencimiento</p>
                  <p className="font-body text-sm">
                    {format(new Date(tarea.fecha_vencimiento), 'PPP', { locale: es })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Comentarios */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold">Comentarios ({comentarios.length})</h3>
            </div>

            <div className="space-y-4 mb-4">
              {comentarios.length === 0 ? (
                <p className="text-center text-muted-foreground font-body text-sm py-8">
                  No hay comentarios todavía. ¡Sé el primero en comentar!
                </p>
              ) : (
                comentarios.map((comentario) => (
                  <div key={comentario.id} className="flex gap-3 animate-fade-in">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-heading">
                        {getInitials(comentario.profiles?.nombre_completo || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-medium text-sm">
                          {comentario.profiles?.nombre_completo}
                        </span>
                        <span className="text-xs text-muted-foreground font-body">
                          {format(new Date(comentario.created_at), 'PPp', { locale: es })}
                        </span>
                      </div>
                      <p className="font-body text-sm text-foreground whitespace-pre-wrap">
                        {comentario.contenido}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Nuevo comentario */}
            <div className="space-y-3">
              <Textarea
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribe un comentario..."
                className="font-body resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-body">
                  {nuevoComentario.length}/1000 caracteres
                </span>
                <Button 
                  onClick={handleSubmitComentario}
                  disabled={loading || !nuevoComentario.trim()}
                  className="gradient-primary shadow-elegant font-heading"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
