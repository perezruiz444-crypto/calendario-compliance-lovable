import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CategorySelector } from './CategorySelector';
import { FileAttachments } from './FileAttachments';
import { TemplateSelector } from './TemplateSelector';
import { cn } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, ChevronDown, Repeat, Paperclip, Tag, Search, Check, X, Sparkles, Building2, User
} from 'lucide-react';

interface CreateTareaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTareaCreated: () => void;
  defaultEmpresaId?: string;
  duplicateData?: any;
}

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25' },
  { value: 'media', label: 'Media', color: 'bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/25' },
  { value: 'baja', label: 'Baja', color: 'bg-success/15 text-success-foreground border-success/30 hover:bg-success/25' },
] as const;

const FRECUENCIA_LABELS: Record<string, string> = {
  diaria: 'día(s)',
  semanal: 'semana(s)',
  quincenal: 'quincena(s)',
  mensual: 'mes(es)',
  trimestral: 'trimestre(s)',
  anual: 'año(s)',
};

function generatePreviewDates(
  startDateStr: string,
  endDateStr: string | null,
  frecuencia: string,
  intervalo: number,
  count: number = 5
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDateStr + 'T12:00:00');
  const maxDate = endDateStr ? new Date(endDateStr + 'T12:00:00') : addYears(new Date(), 1);
  let current = new Date(start);

  while (dates.length < count && current <= maxDate) {
    dates.push(new Date(current));
    switch (frecuencia) {
      case 'diaria': current = addDays(current, intervalo); break;
      case 'semanal': current = addDays(current, 7 * intervalo); break;
      case 'quincenal': current = addDays(current, 14 * intervalo); break;
      case 'mensual': current = addMonths(current, intervalo); break;
      case 'trimestral': current = addMonths(current, 3 * intervalo); break;
      case 'anual': current = addYears(current, intervalo); break;
      default: current = addMonths(current, intervalo);
    }
  }
  return dates;
}

export default function CreateTareaSheet({ open, onOpenChange, onTareaCreated, defaultEmpresaId, duplicateData }: CreateTareaSheetProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<string[]>(defaultEmpresaId ? [defaultEmpresaId] : []);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [recStartPickerOpen, setRecStartPickerOpen] = useState(false);
  const [recEndPickerOpen, setRecEndPickerOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    fecha_vencimiento: '',
    empresa_id: defaultEmpresaId || '',
    consultor_asignado_id: '',
    categoria_id: '',
    es_recurrente: false,
    frecuencia_recurrencia: 'mensual',
    intervalo_recurrencia: 1,
    fecha_inicio_recurrencia: '',
    fecha_fin_recurrencia: '',
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      if (defaultEmpresaId && !formData.empresa_id) {
        setFormData(prev => ({ ...prev, empresa_id: defaultEmpresaId }));
      }
      if (duplicateData) {
        setFormData(duplicateData);
      }
    }
  }, [open, defaultEmpresaId, duplicateData]);

  useEffect(() => {
    if (open && formData.empresa_id) fetchConsultores();
  }, [open, formData.empresa_id]);

  // Auto-fill recurrence start date when enabling recurrence
  useEffect(() => {
    if (formData.es_recurrente && !formData.fecha_inicio_recurrencia) {
      const autoStart = formData.fecha_vencimiento || format(new Date(), 'yyyy-MM-dd');
      setFormData(prev => ({ ...prev, fecha_inicio_recurrencia: autoStart }));
    }
  }, [formData.es_recurrente]);

  const fetchEmpresas = async () => {
    const { data } = await supabase.from('empresas').select('id, razon_social').order('razon_social');
    setEmpresas(data || []);
  };

  const fetchConsultores = async () => {
    const { data: rolesData } = await supabase.from('user_roles').select('user_id').eq('role', 'consultor');
    const ids = rolesData?.map(r => r.user_id) || [];
    if (ids.length === 0) { setConsultores([]); return; }

    if (formData.empresa_id) {
      const { data: asig } = await supabase.from('consultor_empresa_asignacion').select('consultor_id').eq('empresa_id', formData.empresa_id);
      const asigIds = asig?.map(a => a.consultor_id) || [];
      if (asigIds.length === 0) { setConsultores([]); return; }
      const { data } = await supabase.from('profiles').select('id, nombre_completo').in('id', asigIds).order('nombre_completo');
      setConsultores(data || []);
    } else {
      const { data } = await supabase.from('profiles').select('id, nombre_completo').in('id', ids).order('nombre_completo');
      setConsultores(data || []);
    }
  };

  const filteredEmpresas = useMemo(() =>
    empresas.filter(e => e.razon_social.toLowerCase().includes(empresaSearch.toLowerCase())),
    [empresas, empresaSearch]
  );

  const completionPct = useMemo(() => {
    let filled = 0;
    const total = 4;
    if (formData.titulo.trim()) filled++;
    if (formData.empresa_id) filled++;
    if (formData.fecha_vencimiento) filled++;
    if (formData.consultor_asignado_id) filled++;
    return Math.round((filled / total) * 100);
  }, [formData]);

  // Preview of next occurrences
  const previewDates = useMemo(() => {
    if (!formData.es_recurrente || !formData.fecha_inicio_recurrencia) return [];
    return generatePreviewDates(
      formData.fecha_inicio_recurrencia,
      formData.fecha_fin_recurrencia || null,
      formData.frecuencia_recurrencia,
      formData.intervalo_recurrencia,
      5
    );
  }, [formData.es_recurrente, formData.fecha_inicio_recurrencia, formData.fecha_fin_recurrencia, formData.frecuencia_recurrencia, formData.intervalo_recurrencia]);

  // Human-readable recurrence summary
  const recurrenceSummary = useMemo(() => {
    if (!formData.es_recurrente) return '';
    const freqLabel = FRECUENCIA_LABELS[formData.frecuencia_recurrencia] || formData.frecuencia_recurrencia;
    const cada = formData.intervalo_recurrencia > 1 ? `cada ${formData.intervalo_recurrencia} ${freqLabel}` : `cada ${freqLabel.replace('(s)', '').replace('(es)', '')}`;
    const desde = formData.fecha_inicio_recurrencia ? ` desde ${format(new Date(formData.fecha_inicio_recurrencia + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}` : '';
    const hasta = formData.fecha_fin_recurrencia ? ` hasta ${format(new Date(formData.fecha_fin_recurrencia + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}` : ' (sin fecha fin)';
    return `Se repite ${cada}${desde}${hasta}`;
  }, [formData.es_recurrente, formData.frecuencia_recurrencia, formData.intervalo_recurrencia, formData.fecha_inicio_recurrencia, formData.fecha_fin_recurrencia]);

  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const now = new Date();
    let date: Date;
    switch (type) {
      case 'today': date = now; break;
      case 'tomorrow': date = addDays(now, 1); break;
      case 'nextWeek': date = addWeeks(now, 1); break;
    }
    setFormData(prev => ({ ...prev, fecha_vencimiento: format(date, 'yyyy-MM-dd') }));
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      titulo: template.titulo_template.replace('[EMPRESA]', empresas.find(e => e.id === prev.empresa_id)?.razon_social || ''),
      descripcion: template.descripcion_template || '',
      prioridad: template.prioridad || 'media',
      categoria_id: template.categoria_id || ''
    }));
    if (template.duracion_dias && !formData.fecha_vencimiento) {
      setFormData(prev => ({ ...prev, fecha_vencimiento: format(addDays(new Date(), template.duracion_dias), 'yyyy-MM-dd') }));
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '', descripcion: '', prioridad: 'media', fecha_vencimiento: '',
      empresa_id: defaultEmpresaId || '', consultor_asignado_id: '', categoria_id: '',
      es_recurrente: false, frecuencia_recurrencia: 'mensual', intervalo_recurrencia: 1,
      fecha_inicio_recurrencia: '', fecha_fin_recurrencia: '',
    });
    setAttachments([]);
    setSelectedEmpresaIds(defaultEmpresaId ? [defaultEmpresaId] : []);
    setEmpresaSearch('');
    setAdvancedOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.empresa_id) {
      toast.error('Título y empresa son requeridos');
      return;
    }
    // Validate recurrence has a start date
    if (formData.es_recurrente && !formData.fecha_inicio_recurrencia) {
      toast.error('Las tareas recurrentes necesitan una fecha de inicio');
      return;
    }
    setLoading(true);
    try {
      const empresaIds = selectedEmpresaIds.length > 0 ? selectedEmpresaIds : [formData.empresa_id];
      const tareasToInsert = empresaIds.map(eid => ({
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        prioridad: formData.prioridad,
        empresa_id: eid,
        consultor_asignado_id: formData.consultor_asignado_id || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        categoria_id: formData.categoria_id || null,
        archivos_adjuntos: attachments.length > 0 ? attachments : null,
        creado_por: user?.id,
        es_recurrente: formData.es_recurrente,
        frecuencia_recurrencia: formData.es_recurrente ? formData.frecuencia_recurrencia : null,
        intervalo_recurrencia: formData.es_recurrente ? formData.intervalo_recurrencia : null,
        fecha_inicio_recurrencia: formData.es_recurrente && formData.fecha_inicio_recurrencia ? formData.fecha_inicio_recurrencia : null,
        fecha_fin_recurrencia: formData.es_recurrente && formData.fecha_fin_recurrencia ? formData.fecha_fin_recurrencia : null,
      }));

      const { error } = await supabase.from('tareas').insert(tareasToInsert);
      if (error) throw error;

      setSuccessAnim(true);
      setTimeout(() => {
        setSuccessAnim(false);
        toast.success(empresaIds.length > 1 ? `${empresaIds.length} tareas creadas` : 'Tarea creada');
        resetForm();
        onTareaCreated();
        onOpenChange(false);
      }, 600);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find(e => e.id === formData.empresa_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="font-heading text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nueva Tarea
          </SheetTitle>
          <SheetDescription>Completa los campos para crear una tarea</SheetDescription>
          {/* Progress */}
          <div className="flex items-center gap-3 pt-2">
            <Progress value={completionPct} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground font-medium">{completionPct}%</span>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className={cn("space-y-5 pb-6 transition-all", successAnim && "scale-95 opacity-50")}>
            {/* Success overlay */}
            {successAnim && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 rounded-lg">
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                  <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <p className="font-heading font-semibold text-success">¡Tarea creada!</p>
                </div>
              </div>
            )}

            {/* Template quick access */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">Template</Label>
              <TemplateSelector onSelect={handleTemplateSelect} />
            </div>

            {/* Título */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="¿Qué necesitas hacer?"
                maxLength={200}
                autoFocus
                className="text-base font-medium"
              />
            </div>

            {/* Prioridad chips */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">Prioridad</Label>
              <div className="flex gap-2">
                {PRIORIDADES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, prioridad: p.value }))}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
                      formData.prioridad === p.value
                        ? cn(p.color, 'ring-2 ring-offset-1 ring-primary/30 scale-105')
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Empresa with search */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">
                <Building2 className="h-3 w-3 inline mr-1" />
                Empresa *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {selectedEmpresa ? (
                      <span className="truncate">{selectedEmpresa.razon_social}</span>
                    ) : (
                      <span className="text-muted-foreground">Buscar empresa...</span>
                    )}
                    <Search className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Filtrar empresas..."
                      value={empresaSearch}
                      onChange={(e) => setEmpresaSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredEmpresas.map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, empresa_id: e.id }));
                          if (!selectedEmpresaIds.includes(e.id)) {
                            setSelectedEmpresaIds(prev => [...prev, e.id]);
                          }
                          setEmpresaSearch('');
                        }}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
                          formData.empresa_id === e.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        )}
                      >
                        {formData.empresa_id === e.id && <Check className="h-3.5 w-3.5" />}
                        <span className="truncate">{e.razon_social}</span>
                      </button>
                    ))}
                    {filteredEmpresas.length === 0 && (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">Sin resultados</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedEmpresaIds.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedEmpresaIds.map(eid => {
                    const emp = empresas.find(e => e.id === eid);
                    return (
                      <Badge key={eid} variant="secondary" className="text-xs gap-1">
                        {emp?.razon_social}
                        <button type="button" onClick={() => {
                          const updated = selectedEmpresaIds.filter(id => id !== eid);
                          setSelectedEmpresaIds(updated);
                          if (formData.empresa_id === eid) setFormData(prev => ({ ...prev, empresa_id: updated[0] || '' }));
                        }}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  <p className="text-xs text-muted-foreground w-full mt-1">
                    Se creará una tarea por cada empresa ({selectedEmpresaIds.length})
                  </p>
                </div>
              )}
            </div>

            {/* Quick date buttons */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">Fecha de vencimiento</Label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setQuickDate('today')}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    formData.fecha_vencimiento === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}>Hoy</button>
                <button type="button" onClick={() => setQuickDate('tomorrow')}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    formData.fecha_vencimiento === format(addDays(new Date(), 1), 'yyyy-MM-dd')
                      ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}>Mañana</button>
                <button type="button" onClick={() => setQuickDate('nextWeek')}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    formData.fecha_vencimiento === format(addWeeks(new Date(), 1), 'yyyy-MM-dd')
                      ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  )}>Próx. semana</button>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="px-3 py-1.5 rounded-full text-xs font-medium border bg-muted/50 text-muted-foreground border-transparent hover:bg-muted transition-all flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {formData.fecha_vencimiento && !['today', 'tomorrow', 'nextWeek'].some(t => {
                        const d = t === 'today' ? new Date() : t === 'tomorrow' ? addDays(new Date(), 1) : addWeeks(new Date(), 1);
                        return formData.fecha_vencimiento === format(d, 'yyyy-MM-dd');
                      }) ? format(new Date(formData.fecha_vencimiento + 'T12:00:00'), 'dd MMM', { locale: es }) : 'Elegir'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) setFormData(prev => ({ ...prev, fecha_vencimiento: format(date, 'yyyy-MM-dd') }));
                        setDatePickerOpen(false);
                      }}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {formData.fecha_vencimiento && (
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, fecha_vencimiento: '' }))}
                    className="px-2 py-1.5 rounded-full text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Recurrence toggle — prominent, right below due date */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <Label className="font-heading text-sm cursor-pointer">Tarea recurrente</Label>
                </div>
                <Switch
                  checked={formData.es_recurrente}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, es_recurrente: checked }))}
                />
              </div>

              {formData.es_recurrente && (
                <div className="space-y-4 pt-1 animate-in slide-in-from-top-2 duration-200">
                  {/* Frequency + interval */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Frecuencia</Label>
                      <Select value={formData.frecuencia_recurrencia} onValueChange={(v) => setFormData(prev => ({ ...prev, frecuencia_recurrencia: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diaria</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quincenal">Quincenal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Cada</Label>
                      <Input type="number" min="1" value={formData.intervalo_recurrencia}
                        onChange={(e) => setFormData(prev => ({ ...prev, intervalo_recurrencia: parseInt(e.target.value) || 1 }))}
                        className="h-9 text-sm" />
                    </div>
                  </div>

                  {/* Start / End dates with Calendar pickers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Inicio *</Label>
                      <Popover open={recStartPickerOpen} onOpenChange={setRecStartPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-9 text-sm justify-start font-normal", !formData.fecha_inicio_recurrencia && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
                            {formData.fecha_inicio_recurrencia
                              ? format(new Date(formData.fecha_inicio_recurrencia + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                              : 'Seleccionar'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.fecha_inicio_recurrencia ? new Date(formData.fecha_inicio_recurrencia + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) setFormData(prev => ({ ...prev, fecha_inicio_recurrencia: format(date, 'yyyy-MM-dd') }));
                              setRecStartPickerOpen(false);
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Fin (opcional)</Label>
                      <Popover open={recEndPickerOpen} onOpenChange={setRecEndPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full h-9 text-sm justify-start font-normal", !formData.fecha_fin_recurrencia && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
                            {formData.fecha_fin_recurrencia
                              ? format(new Date(formData.fecha_fin_recurrencia + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
                              : 'Sin fin'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.fecha_fin_recurrencia ? new Date(formData.fecha_fin_recurrencia + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) setFormData(prev => ({ ...prev, fecha_fin_recurrencia: format(date, 'yyyy-MM-dd') }));
                              setRecEndPickerOpen(false);
                            }}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {formData.fecha_fin_recurrencia && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, fecha_fin_recurrencia: '' }))}
                          className="text-xs text-muted-foreground hover:text-destructive mt-1 transition-colors">
                          Quitar fecha fin
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Human-readable summary */}
                  {recurrenceSummary && (
                    <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
                      🔄 {recurrenceSummary}
                    </p>
                  )}

                  {/* Preview of next occurrences */}
                  {previewDates.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Próximas ocurrencias</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {previewDates.map((d, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {format(d, 'dd MMM yyyy', { locale: es })}
                          </Badge>
                        ))}
                        {previewDates.length >= 5 && (
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                            ...más
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Descripción */}
            <div>
              <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Detalles adicionales..."
                maxLength={2000}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Consultor */}
            {consultores.length > 0 && (
              <div>
                <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">
                  <User className="h-3 w-3 inline mr-1" />
                  Asignar a
                </Label>
                <Select value={formData.consultor_asignado_id} onValueChange={(v) => setFormData(prev => ({ ...prev, consultor_asignado_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona consultor" /></SelectTrigger>
                  <SelectContent>
                    {consultores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Advanced section */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                  <span className="font-heading">Opciones avanzadas</span>
                  <div className="flex-1 border-t border-dashed" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                {/* Categoría */}
                <div>
                  <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">
                    <Tag className="h-3 w-3 inline mr-1" />
                    Categoría
                  </Label>
                  <CategorySelector
                    value={formData.categoria_id}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_id: v }))}
                  />
                </div>

                {/* Archivos */}
                <div>
                  <Label className="font-heading text-xs text-muted-foreground mb-1.5 block">
                    <Paperclip className="h-3 w-3 inline mr-1" />
                    Archivos
                  </Label>
                  <FileAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3 bg-muted/30">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-heading">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.titulo.trim() || !formData.empresa_id}
            className="gradient-primary shadow-elegant font-heading px-6"
          >
            {loading ? 'Creando...' : 'Crear Tarea'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
