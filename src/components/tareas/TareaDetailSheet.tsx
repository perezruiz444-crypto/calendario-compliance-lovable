import { parseCalendarDate } from '@/lib/obligationDate';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Paperclip, Repeat, Check, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import SendNotificationDialog from './SendNotificationDialog';
import { FileAttachments } from './FileAttachments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { TareaDetalle, ConsultorResumen } from '@/types/domain';
import type { TablesUpdate } from '@/integrations/supabase/types';
import { getAdjuntos } from '@/lib/adjuntos';

type TareaUpdate = TablesUpdate<'tareas'>;
type EditableField = 'titulo' | 'descripcion';

interface TareaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tareaId: string;
  onUpdate?: () => void;
}

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  { value: 'media', label: 'Media', color: 'bg-warning/15 text-warning border-warning/30' },
  { value: 'baja', label: 'Baja', color: 'bg-success/15 text-success border-success/30' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  { value: 'en_progreso', label: 'En Progreso', color: 'bg-primary/15 text-primary' },
  { value: 'completada', label: 'Completada', color: 'bg-success/15 text-success' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-destructive/15 text-destructive' },
];

export default function TareaDetailSheet({ open, onOpenChange, tareaId, onUpdate }: TareaDetailSheetProps) {
  const [tarea, setTarea] = useState<TareaDetalle | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [consultores, setConsultores] = useState<ConsultorResumen[]>([]);

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveIndicator, setSaveIndicator] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open && tareaId) {
      fetchTareaData();
    }
  }, [open, tareaId]);

  // Solo consultores asignados a la empresa de la tarea (la BD rechaza otros)
  useEffect(() => {
    if (open && tarea?.empresa_id) fetchConsultores(tarea.empresa_id);
  }, [open, tarea?.empresa_id]);

  const fetchTareaData = async () => {
    setLoadingData(true);
    try {
      const { data: tareaData, error } = await supabase
        .from('tareas')
        .select(`*, empresas(razon_social)`)
        .eq('id', tareaId)
        .maybeSingle();

      if (error) throw error;
      if (!tareaData) { toast.error('Tarea no encontrada'); onOpenChange(false); return; }

      let consultorData = null;
      if (tareaData.consultor_asignado_id) {
        const { data } = await supabase.from('profiles').select('id, nombre_completo').eq('id', tareaData.consultor_asignado_id).maybeSingle();
        consultorData = data;
      }

      setTarea({ ...tareaData, archivos_adjuntos: getAdjuntos(tareaData.archivos_adjuntos), consultor_profile: consultorData });
    } catch (error) {
      logger.error('Error fetching tarea:', error);
      toast.error('Error al cargar la tarea');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchConsultores = async (empresaId: string) => {
    const { data: asig } = await supabase.from('consultor_empresa_asignacion').select('consultor_id').eq('empresa_id', empresaId);
    const ids = asig?.map(a => a.consultor_id) || [];
    if (ids.length === 0) { setConsultores([]); return; }
    const { data } = await supabase.from('profiles').select('id, nombre_completo').in('id', ids).order('nombre_completo');
    setConsultores(data || []);
  };

  const showSaveIndicator = (field: string) => {
    setSaveIndicator(field);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveIndicator(null), 1500);
  };

  const updateField = useCallback(async (field: keyof TareaUpdate & keyof TareaDetalle, value: TareaUpdate[keyof TareaUpdate]) => {
    try {
      const patch: TareaUpdate = { [field]: value };
      const { error } = await supabase.from('tareas').update(patch).eq('id', tareaId);
      if (error) throw error;
      setTarea(prev => prev && { ...prev, [field]: value });
      showSaveIndicator(field);
      onUpdate?.();
    } catch (error) {
      logger.error('Error updating field:', error);
      toast.error('Error al actualizar');
    }
  }, [tareaId, onUpdate]);

  const startEditing = (field: EditableField, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const finishEditing = (field: EditableField) => {
    if (editValue !== (tarea?.[field] || '')) {
      updateField(field, editValue.trim() || null);
    }
    setEditingField(null);
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

          <div className="flex flex-wrap gap-2 pt-2">
            {ESTADOS.map(e => (
              <button
                key={e.value}
                type="button"
                onClick={() => updateField('estado', e.value)}
                className={cn(
                  'px-3 py-1 rounded-none text-xs font-medium border transition-all',
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

            {/* Prioridad */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Prioridad</label>
              <div className="flex gap-2 items-center">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => updateField('prioridad', p.value)}
                    className={cn(
                      'px-3 py-1 rounded-none text-xs font-medium border transition-all',
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
                        ? format(parseCalendarDate(tarea.fecha_vencimiento), 'dd MMM yyyy', { locale: es })
                        : 'Sin fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tarea.fecha_vencimiento ? parseCalendarDate(tarea.fecha_vencimiento) : undefined}
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

            {/* Empresa */}
            {tarea.empresas && (
              <div>
                <label className="text-xs font-heading text-muted-foreground mb-1 block">Empresa</label>
                <p className="text-sm font-medium">{tarea.empresas.razon_social}</p>
              </div>
            )}

            {/* Consultor principal */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block">Responsable principal</label>
              <div className="flex items-center gap-2">
                <Select
                  value={tarea.consultor_asignado_id || ''}
                  onValueChange={(v) => {
                    updateField('consultor_asignado_id', v || null);
                    const c = consultores.find(c => c.id === v);
                    setTarea(prev => prev && { ...prev, consultor_profile: c || null });
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

            {/* Descripción */}
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
                <button
                  type="button"
                  aria-label="Editar descripción de la tarea"
                  className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group cursor-pointer rounded-md p-3 border border-transparent hover:border-border hover:bg-muted/30 transition-all min-h-[60px]"
                  onClick={() => startEditing('descripcion', tarea.descripcion || '')}
                >
                  {tarea.descripcion ? (
                    <p className="text-sm whitespace-pre-wrap">{tarea.descripcion}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Click para agregar descripción...</p>
                  )}
                  <Pencil className="h-3 w-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-40 sm:group-focus-within:opacity-40 float-right mt-1 transition-opacity" />
                </button>
              )}
              <SavedIndicator field="descripcion" />
            </div>

            {/* Recurrencia */}
            {tarea.es_recurrente && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <Repeat className="h-4 w-4" />
                <span>Tarea recurrente ({tarea.frecuencia_recurrencia})</span>
              </div>
            )}

            {/* Evidencias */}
            <div>
              <label className="text-xs font-heading text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> Evidencias ({tarea.archivos_adjuntos?.length || 0})
              </label>
              <FileAttachments
                empresaId={tarea.empresa_id}
                tareaId={tarea.id}
                attachments={tarea.archivos_adjuntos ?? []}
                onAttachmentsChange={async (next) => {
                  const { error } = await supabase
                    .from('tareas')
                    .update({ archivos_adjuntos: next.length > 0 ? next : null })
                    .eq('id', tarea.id);
                  if (error) {
                    toast.error('No se pudo guardar la evidencia: ' + error.message);
                    return;
                  }
                  setTarea(prev => prev && { ...prev, archivos_adjuntos: next });
                  onUpdate?.();
                }}
              />
            </div>

            <div className="border-t pt-5">
              <SendNotificationDialog tareaId={tareaId} />
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
