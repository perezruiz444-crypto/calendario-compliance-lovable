import { useEffect, useState, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Send, MessageSquare, Calendar as CalendarIcon, Paperclip, Repeat, Check, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SendNotificationDialog from './SendNotificationDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TareaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: string;
  onUpdate?: () => void;
}

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  { value: 'media', label: 'Media', color: 'bg-warning/15 text-warning-foreground border-warning/30' },
  { value: 'baja', label: 'Baja', color: 'bg-success/15 text-success-foreground border-success/30' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  { value: 'en_progreso', label: 'En Progreso', color: 'bg-primary/15 text-primary' },
  { value: 'completada', label: 'Completada', color: 'bg-success/15 text-success-foreground' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-destructive/15 text-destructive' },
];

export default function TareaDetailSheet({ open, onOpenChange, tareaId, onUpdate }: TareaDetailSheetProps) {
  const { user } = useAuth();
  const [tarea, setTarea] = useState<any>(null);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (open && tareaId) {
      fetchTareaData();
      fetchConsultores();
      fetchCategorias();
    }
  }, [open, tareaId]);

  const fetchTareaData = async () => {
    setLoadingData(true);
    try {
      const { data: tareaData, error } = await supabase
        .from('tareas')
        .select(`*, empresas(razon_social), categorias_tareas(id, nombre, color)`)
        .eq('id', tareaId)
        .maybeSingle();

      if (error) throw error;
      if (!tareaData) { toast.error('Tarea no encontrada'); onOpenChange(false); return; }

      let consultorData = null;
      if (tareaData.consultor_asignado_id) {
        const { data } = await supabase.from('profiles').select('id, nombre_completo').eq('id', tareaData.consultor_asignado_id).maybeSingle();
        consultorData = data;
      }

      setTarea({ ...tareaData, consultor_profile: consultorData });

      const { data: comentariosData } = await supabase
        .from('comentarios')
        .select('*, profiles(nombre_completo)')
        .eq('tarea_id', tareaId)
        .order('created_at', { ascending: true });
      setComentarios(comentariosData || []);
    } catch (error) {
      console.error('Error fetching tarea:', error);
      toast.error('Error al cargar la tarea');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchConsultores = async () => {
    const { data: rolesData } = await supabase.from('user_roles').select('user_id').eq('role', 'consultor');
    const ids = rolesData?.map(r => r.user_id) || [];
    if (ids.length === 0) return;
    const { data } = await supabase.from('profiles').select('id, nombre_completo').in('id', ids).order('nombre_completo');
    setConsultores(data || []);
  };

  const fetchCategorias = async () => {
    const { data } = await supabase.from('categorias_tareas').select('*').order('nombre');
    setCategorias(data || []);
  };

  const showSaveIndicator = (field: string) => {
    setSaveIndicator(field);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator(null), 1500);
  };

  const updateField = useCallback(async (field: string, value: any) => {
    try {
      const { error } = await supabase.from('tareas').update({ [field]: value }).eq('id', tareaId);
      if (error) throw error;
      setTarea((prev: any) => ({ ...prev, [field]: value }));
      showSaveIndicator(field);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Error al actualizar');
    }
  }, [tareaId, onUpdate]);

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const finishEditing = (field: string) => {
    if (editValue !== (tarea?.[field] || '')) {
      updateField(field, editValue.trim() || null);
    }
    setEditingField(null);
  };

  const handleAddComentario = async () => {
    if (!nuevoComentario.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('comentarios').insert({ tarea_id: tareaId, user_id: user?.id, contenido: nuevoComentario });
      if (error) throw error;
      toast.success('Comentario agregado');
      setNuevoComentario('');
      fetchTareaData();
    } catch (error) {
      toast.error('Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  const SavedIndicator = ({ field }: { field: string }) => (
    saveIndicator === field ? (
      <span className="inline-flex items-center gap-1 text-xs text-success animate-in fade-in slide-in-from-left-2">
        <Check className="h-3 w-3" /> Guardado
      </span>
    ) : null
  );

  if (loadingData || !tarea) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          {/* Editable Title */}
          <div className="flex items-start gap-2">
            {editingField === 'titulo' ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => finishEditing('titulo')}
                  onKeyDown={(e) => { if (e.key === 'Enter') finishEditing('titulo'); if (e.key === 'Escape') setEditingField(null); }}
                  autoFocus
                  className="text-xl font-heading font-bold"
                />
              </div>
            ) : (
              <SheetTitle
                className="text-xl font-heading cursor-pointer hover:text-primary/80 transition-colors group flex items-center gap-2 flex-1"
                onClick={() => startEditing('titulo', tarea.titulo)}
              >
                {tarea.titulo}
                <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
              </SheetTitle>
            )}
            <SavedIndicator field="titulo" />
          </div>
          <SheetDescription className="sr-only">Detalle de la tarea</SheetDescription>

          {/* Estado chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {ESTADOS.map(e => (
              <button
                key={e.value}
                type="button"
                onClick={() => updateField('estado', e.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  tarea.estado === e.value
                    ? cn(e.color, 'ring-1 ring-offset-1 ring-primary/20')
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
                )}
              >
                {e.label}
              </button>
            ))}
            <SavedIndicator field="estado" />
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="px-6 py-5 space-y-5">

            {/* Prioridad chips */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Prioridad</label>
              <div className="flex gap-2 items-center">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => updateField('prioridad', p.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      tarea.prioridad === p.value
                        ? cn(p.color, 'ring-1 ring-offset-1 ring-primary/20')
                        : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/60'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <SavedIndicator field="prioridad" />
              </div>
            </div>

            {/* Fecha vencimiento */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Fecha de vencimiento</label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="font-normal gap-2">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {tarea.fecha_vencimiento
                        ? format(new Date(tarea.fecha_vencimiento), 'dd MMM yyyy', { locale: es })
                        : 'Sin fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tarea.fecha_vencimiento ? new Date(tarea.fecha_vencimiento) : undefined}
                      onSelect={(date) => {
                        if (date) updateField('fecha_vencimiento', format(date, 'yyyy-MM-dd'));
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {tarea.fecha_vencimiento && (
                  <button type="button" onClick={() => updateField('fecha_vencimiento', null)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <SavedIndicator field="fecha_vencimiento" />
              </div>
            </div>

            {/* Empresa (read-only) */}
            {tarea.empresas && (
              <div>
                <label className="text-xs font-heading text-muted-foreground mb-1 block">Empresa</label>
                <p className="text-sm font-medium">{tarea.empresas.razon_social}</p>
              </div>
            )}

            {/* Consultor asignado */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Asignado a</label>
              <div className="flex items-center gap-2">
                <Select
                  value={tarea.consultor_asignado_id || ''}
                  onValueChange={(v) => {
                    updateField('consultor_asignado_id', v || null);
                    const c = consultores.find(c => c.id === v);
                    setTarea((prev: any) => ({ ...prev, consultor_profile: c || null }));
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9 text-sm">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SavedIndicator field="consultor_asignado_id" />
              </div>
            </div>

            {/* Categoría */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Categoría</label>
              <div className="flex items-center gap-2">
                <Select
                  value={tarea.categoria_id || ''}
                  onValueChange={(v) => {
                    updateField('categoria_id', v || null);
                    const cat = categorias.find(c => c.id === v);
                    setTarea((prev: any) => ({ ...prev, categorias_tareas: cat || null }));
                  }}
                >
                  <SelectTrigger className="w-[200px] h-9 text-sm">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <SavedIndicator field="categoria_id" />
              </div>
            </div>

            {/* Descripción editable */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Descripción</label>
              {editingField === 'descripcion' ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                    autoFocus
                    className="resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => finishEditing('descripcion')}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="group cursor-pointer rounded-md p-3 border border-transparent hover:border-border hover:bg-muted/30 transition-all min-h-[60px]"
                  onClick={() => startEditing('descripcion', tarea.descripcion || '')}
                >
                  {tarea.descripcion ? (
                    <p className="text-sm whitespace-pre-wrap">{tarea.descripcion}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Click para agregar descripción...</p>
                  )}
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 float-right mt-1 transition-opacity" />
                </div>
              )}
              <SavedIndicator field="descripcion" />
            </div>

            {/* Recurrencia info */}
            {tarea.es_recurrente && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <Repeat className="h-4 w-4" />
                <span>Tarea recurrente ({tarea.frecuencia_recurrencia})</span>
              </div>
            )}

            {/* Archivos */}
            {tarea.archivos_adjuntos && tarea.archivos_adjuntos.length > 0 && (
              <div>
                <label className="text-xs font-heading text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Archivos ({tarea.archivos_adjuntos.length})
                </label>
                <div className="space-y-1.5">
                  {tarea.archivos_adjuntos.map((file: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-md text-sm">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{file.name || 'Archivo'}</span>
                      {file.url && (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">Ver</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comentarios */}
            <div className="border-t pt-5">
              <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentarios ({comentarios.length})
              </h3>

              <div className="space-y-3 mb-4">
                {comentarios.map((c) => (
                  <div key={c.id} className="border rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">
                          {c.profiles?.nombre_completo?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">{c.profiles?.nombre_completo}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.contenido}</p>
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
                  rows={2}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddComentario} disabled={loading || !nuevoComentario.trim()}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar
                  </Button>
                  <SendNotificationDialog tareaId={tareaId} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
