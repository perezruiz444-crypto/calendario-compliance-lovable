import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Send, MessageSquare, Calendar, User, Paperclip, Repeat, X } from 'lucide-react';
import { format } from 'date-fns';
import SendNotificationDialog from './SendNotificationDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TareaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: string;
  onUpdate?: () => void;
}

export default function TareaDetailSheet({ open, onOpenChange, tareaId, onUpdate }: TareaDetailSheetProps) {
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
      const { data: tareaData, error: tareaError } = await supabase
        .from('tareas')
        .select(`
          *,
          empresas(razon_social),
          categorias_tareas(nombre, color)
        `)
        .eq('id', tareaId)
        .single();

      if (tareaError) throw tareaError;

      const { data: consultorData } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .eq('id', tareaData.consultor_asignado_id)
        .single();

      setTarea({
        ...tareaData,
        consultor_profile: consultorData
      });

      const { data: comentariosData, error: comentariosError } = await supabase
        .from('comentarios')
        .select('*, profiles(nombre_completo)')
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: true });

      if (comentariosError) throw comentariosError;
      setComentarios(comentariosData || []);
    } catch (error) {
      console.error('Error fetching tarea:', error);
      toast.error('Error al cargar la tarea');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddComentario = async () => {
    if (!nuevoComentario.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('comentarios')
        .insert({
          tarea_id: tareaId,
          user_id: user?.id,
          contenido: nuevoComentario
        });

      if (error) throw error;

      toast.success('Comentario agregado');
      setNuevoComentario('');
      fetchTareaData();
    } catch (error) {
      console.error('Error adding comentario:', error);
      toast.error('Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEstado = async (newEstado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada') => {
    try {
      const { error } = await supabase
        .from('tareas')
        .update({ estado: newEstado })
        .eq('id', tareaId);

      if (error) throw error;

      toast.success('Estado actualizado');
      fetchTareaData();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating estado:', error);
      toast.error('Error al actualizar estado');
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-white';
      case 'baja': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-gray-500 text-white';
      case 'en_progreso': return 'bg-blue-500 text-white';
      case 'completada': return 'bg-green-500 text-white';
      case 'cancelada': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loadingData || !tarea) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <p>Cargando...</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle className="text-2xl font-heading mb-2">{tarea.titulo}</SheetTitle>
                <SheetDescription className="flex flex-wrap gap-2">
                  <Badge className={getPrioridadColor(tarea.prioridad)}>
                    {tarea.prioridad.charAt(0).toUpperCase() + tarea.prioridad.slice(1)}
                  </Badge>
                  <Badge className={getEstadoColor(tarea.estado)}>
                    {tarea.estado.replace('_', ' ').charAt(0).toUpperCase() + tarea.estado.slice(1).replace('_', ' ')}
                  </Badge>
                  {tarea.categorias_tareas && (
                    <Badge style={{ backgroundColor: tarea.categorias_tareas.color }} className="text-white">
                      {tarea.categorias_tareas.nombre}
                    </Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6">
              {/* Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Vence: {tarea.fecha_vencimiento ? format(new Date(tarea.fecha_vencimiento), 'dd/MM/yyyy') : 'Sin fecha'}</span>
                </div>

                {tarea.empresas && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{tarea.empresas.razon_social}</span>
                  </div>
                )}

                {tarea.consultor_profile && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {tarea.consultor_profile.nombre_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Asignado a: {tarea.consultor_profile.nombre_completo}</span>
                  </div>
                )}

                {tarea.es_recurrente && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Repeat className="h-4 w-4" />
                    <span>Tarea recurrente ({tarea.frecuencia_recurrencia})</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {tarea.descripcion && (
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tarea.descripcion}</p>
                </div>
              )}

              {/* Estado Update */}
              <div>
                <h3 className="font-semibold mb-2">Actualizar Estado</h3>
                <Select value={tarea.estado} onValueChange={handleUpdateEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Attachments */}
              {tarea.archivos_adjuntos && tarea.archivos_adjuntos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Archivos Adjuntos ({tarea.archivos_adjuntos.length})
                  </h3>
                  <div className="space-y-2">
                    {tarea.archivos_adjuntos.map((file: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm flex-1">{file.name || 'Archivo'}</span>
                        {file.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              Ver
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentarios ({comentarios.length})
                </h3>
                
                <div className="space-y-4 mb-4">
                  {comentarios.map((comentario) => (
                    <div key={comentario.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {comentario.profiles?.nombre_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{comentario.profiles?.nombre_completo}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comentario.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comentario.contenido}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Agregar comentario..."
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddComentario} disabled={loading || !nuevoComentario.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Comentario
                    </Button>
                    <SendNotificationDialog tareaId={tareaId} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
