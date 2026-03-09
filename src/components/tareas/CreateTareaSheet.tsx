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
import { Switch } from '@/components/ui/switch';
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
  CalendarIcon, ChevronDown, Repeat, Paperclip, Tag, Search, Check, X,
  Sparkles, Building2, User, FileText, Clock
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

const RECURRENCE_PRESETS = [
  { label: 'Cada día', frecuencia: 'diaria', intervalo: 1 },
  { label: 'Cada semana', frecuencia: 'semanal', intervalo: 1 },
  { label: 'Cada 15 días', frecuencia: 'quincenal', intervalo: 1 },
  { label: 'Cada mes', frecuencia: 'mensual', intervalo: 1 },
  { label: 'Cada trimestre', frecuencia: 'trimestral', intervalo: 1 },
  { label: 'Cada año', frecuencia: 'anual', intervalo: 1 },
] as const;

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

function getRecurrenceSummary(frecuencia: string, intervalo: number, inicio: string, fin: string): string {
  const labels: Record<string, [string, string]> = {
    diaria: ['día', 'días'],
    semanal: ['semana', 'semanas'],
    quincenal: ['quincena', 'quincenas'],
    mensual: ['mes', 'meses'],
    trimestral: ['trimestre', 'trimestres'],
    anual: ['año', 'años'],
  };
  const [sing, plur] = labels[frecuencia] || [frecuencia, frecuencia];
  const cada = intervalo === 1 ? `cada ${sing}` : `cada ${intervalo} ${plur}`;
  const desde = inicio ? ` desde ${format(new Date(inicio + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}` : '';
  const hasta = fin ? ` hasta ${format(new Date(fin + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}` : '';
  return `Se repite ${cada}${desde}${hasta}`;
}

// Section header with inline summary
function SectionHeader({ icon: Icon, title, summary, isOpen, onToggle }: {
  icon: React.ElementType;
  title: string;
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg text-sm transition-all group",
        isOpen
          ? "bg-primary/5 text-foreground"
          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
        isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="font-heading font-medium">{title}</span>
      {!isOpen && summary && (
        <span className="ml-auto mr-2 text-xs text-muted-foreground truncate max-w-[180px]">{summary}</span>
      )}
      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 ml-auto transition-transform text-muted-foreground", isOpen && "rotate-180")} />
    </button>
  );
}

export default function CreateTareaSheet({ open, onOpenChange, onTareaCreated, defaultEmpresaId, duplicateData }: CreateTareaSheetProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [pendingSubtareas, setPendingSubtareas] = useState<{ titulo: string; descripcion?: string }[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<string[]>(defaultEmpresaId ? [defaultEmpresaId] : []);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [recStartPickerOpen, setRecStartPickerOpen] = useState(false);
  const [recEndPickerOpen, setRecEndPickerOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [customRecurrence, setCustomRecurrence] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  // Section states
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        setSchedulingOpen(true);
        setDetailsOpen(true);
      }
    }
  }, [open, defaultEmpresaId, duplicateData]);

  useEffect(() => {
    if (open && formData.empresa_id) fetchConsultores();
  }, [open, formData.empresa_id]);

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

  const recurrenceSummary = useMemo(() => {
    if (!formData.es_recurrente) return '';
    return getRecurrenceSummary(formData.frecuencia_recurrencia, formData.intervalo_recurrencia, formData.fecha_inicio_recurrencia, formData.fecha_fin_recurrencia);
  }, [formData.es_recurrente, formData.frecuencia_recurrencia, formData.intervalo_recurrencia, formData.fecha_inicio_recurrencia, formData.fecha_fin_recurrencia]);

  // Inline summaries for collapsed sections
  const schedulingSummary = useMemo(() => {
    const parts: string[] = [];
    if (formData.fecha_vencimiento) {
      parts.push(`📅 ${format(new Date(formData.fecha_vencimiento + 'T12:00:00'), 'dd MMM', { locale: es })}`);
    }
    if (formData.es_recurrente) {
      const preset = RECURRENCE_PRESETS.find(p => p.frecuencia === formData.frecuencia_recurrencia && p.intervalo === formData.intervalo_recurrencia);
      parts.push(`🔄 ${preset?.label || 'Personalizado'}`);
    }
    return parts.join(' · ');
  }, [formData.fecha_vencimiento, formData.es_recurrente, formData.frecuencia_recurrencia, formData.intervalo_recurrencia]);

  const detailsSummary = useMemo(() => {
    const parts: string[] = [];
    if (formData.descripcion) parts.push('📝 Con descripción');
    if (formData.consultor_asignado_id) {
      const c = consultores.find(c => c.id === formData.consultor_asignado_id);
      if (c) parts.push(`👤 ${c.nombre_completo.split(' ')[0]}`);
    }
    if (formData.categoria_id) parts.push('🏷️ Categoría');
    if (attachments.length > 0) parts.push(`📎 ${attachments.length}`);
    return parts.join(' · ');
  }, [formData.descripcion, formData.consultor_asignado_id, formData.categoria_id, attachments, consultores]);

  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const now = new Date();
    const date = type === 'today' ? now : type === 'tomorrow' ? addDays(now, 1) : addWeeks(now, 1);
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

  const handlePresetSelect = (preset: typeof RECURRENCE_PRESETS[number]) => {
    setFormData(prev => ({
      ...prev,
      es_recurrente: true,
      frecuencia_recurrencia: preset.frecuencia,
      intervalo_recurrencia: preset.intervalo,
    }));
    setCustomRecurrence(false);
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
    setSchedulingOpen(false);
    setDetailsOpen(false);
    setCustomRecurrence(false);
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.empresa_id) {
      toast.error('Título y empresa son requeridos');
      return;
    }
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
        onTareaCreated();
        if (createAnother) {
          resetForm();
        } else {
          resetForm();
          onOpenChange(false);
        }
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find(e => e.id === formData.empresa_id);
  const activePreset = RECURRENCE_PRESETS.find(
    p => p.frecuencia === formData.frecuencia_recurrencia && p.intervalo === formData.intervalo_recurrencia
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle className="font-heading text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Nueva Tarea
          </SheetTitle>
          <SheetDescription>Crea tareas rápidamente</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className={cn("space-y-4 pb-6 transition-all", successAnim && "scale-95 opacity-50")}>
            {successAnim && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                  <div className="h-14 w-14 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                  <p className="font-heading font-semibold text-success text-sm">¡Tarea creada!</p>
                </div>
              </div>
            )}

            {/* Template */}
            <TemplateSelector onSelect={handleTemplateSelect} />

            {/* ═══ SECTION 1: ESSENTIALS (always visible) ═══ */}
            <div className="space-y-3">
              {/* Título */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="¿Qué necesitas hacer?"
                  maxLength={200}
                  autoFocus
                  className="text-base font-medium"
                />
              </div>

              {/* Empresa searchable */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
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
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="p-2 border-b">
                      <Input placeholder="Filtrar..." value={empresaSearch} onChange={(e) => setEmpresaSearch(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto p-1">
                      {filteredEmpresas.map(e => (
                        <button key={e.id} type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, empresa_id: e.id }));
                            if (!selectedEmpresaIds.includes(e.id)) setSelectedEmpresaIds(prev => [...prev, e.id]);
                            setEmpresaSearch('');
                          }}
                          className={cn('w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2',
                            formData.empresa_id === e.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
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
                      Se creará una tarea por empresa ({selectedEmpresaIds.length})
                    </p>
                  </div>
                )}
              </div>

              {/* Prioridad chips */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Prioridad</Label>
                <div className="flex gap-2">
                  {PRIORIDADES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, prioridad: p.value }))}
                      className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                        formData.prioridad === p.value
                          ? cn(p.color, 'ring-1 ring-offset-1 ring-primary/30')
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                      )}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border/50" />

            {/* ═══ SECTION 2: SCHEDULING (collapsible) ═══ */}
            <div>
              <SectionHeader
                icon={Clock}
                title="Programación"
                summary={schedulingSummary}
                isOpen={schedulingOpen}
                onToggle={() => setSchedulingOpen(v => !v)}
              />
              <Collapsible open={schedulingOpen}>
                <CollapsibleContent className="space-y-4 pt-3 pl-1 animate-in slide-in-from-top-2 duration-200">
                  {/* Quick date */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Fecha de vencimiento</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { t: 'today' as const, l: 'Hoy' },
                        { t: 'tomorrow' as const, l: 'Mañana' },
                        { t: 'nextWeek' as const, l: 'Próx. semana' },
                      ].map(({ t, l }) => (
                        <button key={t} type="button" onClick={() => setQuickDate(t)}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-all border border-transparent">
                          {l}
                        </button>
                      ))}
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-all flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {formData.fecha_vencimiento ? format(new Date(formData.fecha_vencimiento + 'T12:00:00'), 'dd MMM', { locale: es }) : 'Elegir'}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single"
                            selected={formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento + 'T12:00:00') : undefined}
                            onSelect={(d) => { if (d) setFormData(prev => ({ ...prev, fecha_vencimiento: format(d, 'yyyy-MM-dd') })); setDatePickerOpen(false); }}
                            className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      {formData.fecha_vencimiento && (
                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, fecha_vencimiento: '' }))}
                          className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      )}
                    </div>
                  </div>

                  {/* Recurrence */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-primary" />
                        <Label className="font-heading text-sm cursor-pointer">Repetir</Label>
                      </div>
                      <Switch
                        checked={formData.es_recurrente}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, es_recurrente: checked }))}
                      />
                    </div>

                    {formData.es_recurrente && (
                      <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        {/* Preset chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {RECURRENCE_PRESETS.map(preset => (
                            <button key={preset.label} type="button"
                              onClick={() => handlePresetSelect(preset)}
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                                !customRecurrence && activePreset?.label === preset.label
                                  ? 'bg-primary/15 text-primary border-primary/30 ring-1 ring-primary/20'
                                  : 'bg-background text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                              )}>
                              {preset.label}
                            </button>
                          ))}
                          <button type="button"
                            onClick={() => setCustomRecurrence(true)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                              customRecurrence
                                ? 'bg-primary/15 text-primary border-primary/30 ring-1 ring-primary/20'
                                : 'bg-background text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                            )}>
                            Personalizado...
                          </button>
                        </div>

                        {/* Custom frequency/interval */}
                        {customRecurrence && (
                          <div className="grid grid-cols-2 gap-2 animate-in fade-in-0 duration-150">
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1 block">Frecuencia</Label>
                              <Select value={formData.frecuencia_recurrencia} onValueChange={(v) => setFormData(prev => ({ ...prev, frecuencia_recurrencia: v }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                className="h-8 text-xs" />
                            </div>
                          </div>
                        )}

                        {/* Start/End dates */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Inicio</Label>
                            <Popover open={recStartPickerOpen} onOpenChange={setRecStartPickerOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-8 text-xs justify-start font-normal", !formData.fecha_inicio_recurrencia && "text-muted-foreground")}>
                                  <CalendarIcon className="h-3 w-3 mr-1.5 opacity-50" />
                                  {formData.fecha_inicio_recurrencia
                                    ? format(new Date(formData.fecha_inicio_recurrencia + 'T12:00:00'), 'dd MMM yy', { locale: es })
                                    : 'Seleccionar'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single"
                                  selected={formData.fecha_inicio_recurrencia ? new Date(formData.fecha_inicio_recurrencia + 'T12:00:00') : undefined}
                                  onSelect={(d) => { if (d) setFormData(prev => ({ ...prev, fecha_inicio_recurrencia: format(d, 'yyyy-MM-dd') })); setRecStartPickerOpen(false); }}
                                  className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Fin (opcional)</Label>
                            <Popover open={recEndPickerOpen} onOpenChange={setRecEndPickerOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-8 text-xs justify-start font-normal", !formData.fecha_fin_recurrencia && "text-muted-foreground")}>
                                  <CalendarIcon className="h-3 w-3 mr-1.5 opacity-50" />
                                  {formData.fecha_fin_recurrencia
                                    ? format(new Date(formData.fecha_fin_recurrencia + 'T12:00:00'), 'dd MMM yy', { locale: es })
                                    : 'Sin fin'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single"
                                  selected={formData.fecha_fin_recurrencia ? new Date(formData.fecha_fin_recurrencia + 'T12:00:00') : undefined}
                                  onSelect={(d) => { if (d) setFormData(prev => ({ ...prev, fecha_fin_recurrencia: format(d, 'yyyy-MM-dd') })); setRecEndPickerOpen(false); }}
                                  className="p-3 pointer-events-auto" />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Summary + mini-timeline */}
                        {recurrenceSummary && (
                          <p className="text-xs text-muted-foreground italic px-2 py-1.5 bg-muted/40 rounded-md">
                            🔄 {recurrenceSummary}
                          </p>
                        )}
                        {previewDates.length > 0 && (
                          <div className="pl-1">
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Próximas ocurrencias</Label>
                            <div className="relative pl-4 space-y-0">
                              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                              {previewDates.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 py-1 relative">
                                  <div className="absolute left-[-13px] h-2 w-2 rounded-full bg-primary/60 ring-2 ring-background" />
                                  <span className="text-xs text-muted-foreground">
                                    {format(d, "EEE dd MMM yyyy", { locale: es })}
                                  </span>
                                </div>
                              ))}
                              {previewDates.length >= 5 && (
                                <div className="flex items-center gap-2 py-1 relative">
                                  <div className="absolute left-[-13px] h-2 w-2 rounded-full bg-muted-foreground/30 ring-2 ring-background" />
                                  <span className="text-xs text-muted-foreground/60">...y más</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border-t border-border/50" />

            {/* ═══ SECTION 3: DETAILS (collapsible) ═══ */}
            <div>
              <SectionHeader
                icon={FileText}
                title="Detalles"
                summary={detailsSummary}
                isOpen={detailsOpen}
                onToggle={() => setDetailsOpen(v => !v)}
              />
              <Collapsible open={detailsOpen}>
                <CollapsibleContent className="space-y-3 pt-3 pl-1 animate-in slide-in-from-top-2 duration-200">
                  {/* Descripción */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Descripción</Label>
                    <Textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                      placeholder="Detalles adicionales..."
                      maxLength={2000}
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Consultor */}
                  {consultores.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        <User className="h-3 w-3 inline mr-1" />
                        Asignar a
                      </Label>
                      <Select value={formData.consultor_asignado_id} onValueChange={(v) => setFormData(prev => ({ ...prev, consultor_asignado_id: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          {consultores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Categoría */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">
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
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      <Paperclip className="h-3 w-3 inline mr-1" />
                      Archivos
                    </Label>
                    <FileAttachments attachments={attachments} onAttachmentsChange={setAttachments} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/30">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={createAnother} onChange={(e) => setCreateAnother(e.target.checked)} className="rounded border-input" />
            Crear otra
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              size="sm"
              disabled={loading || !formData.titulo.trim() || !formData.empresa_id}
              className="gradient-primary shadow-elegant font-heading"
            >
              {loading ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
