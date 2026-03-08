import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Zap, ChevronDown, CalendarIcon, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { TemplateSelector } from './TemplateSelector';

interface QuickCreateTareaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTareaCreated: () => void;
  defaultEmpresaId?: string;
}

const PRIORIDADES = [
  { value: 'alta', label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25' },
  { value: 'media', label: 'Media', color: 'bg-warning/15 text-warning-foreground border-warning/30 hover:bg-warning/25' },
  { value: 'baja', label: 'Baja', color: 'bg-success/15 text-success-foreground border-success/30 hover:bg-success/25' },
] as const;

export default function QuickCreateTarea({ open, onOpenChange, onTareaCreated, defaultEmpresaId }: QuickCreateTareaProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState('');

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    fecha_vencimiento: '',
    empresa_id: defaultEmpresaId || '',
    consultor_asignado_id: '',
    categoria_id: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      if (defaultEmpresaId) setFormData(prev => ({ ...prev, empresa_id: defaultEmpresaId }));
    }
  }, [open, defaultEmpresaId]);

  useEffect(() => {
    if (open && formData.empresa_id) fetchConsultores();
  }, [open, formData.empresa_id]);

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

  const setQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek') => {
    const now = new Date();
    const date = type === 'today' ? now : type === 'tomorrow' ? addDays(now, 1) : addWeeks(now, 1);
    setFormData(prev => ({ ...prev, fecha_vencimiento: format(date, 'yyyy-MM-dd') }));
  };

  const resetForm = () => {
    setFormData({ titulo: '', descripcion: '', prioridad: 'media', fecha_vencimiento: '', empresa_id: defaultEmpresaId || '', consultor_asignado_id: '', categoria_id: '' });
    setMoreOpen(false);
    setEmpresaSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.empresa_id) {
      toast.error('Título y empresa son requeridos');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('tareas').insert({
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        prioridad: formData.prioridad,
        empresa_id: formData.empresa_id,
        consultor_asignado_id: formData.consultor_asignado_id || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        categoria_id: formData.categoria_id || null,
        creado_por: user?.id
      });
      if (error) throw error;

      setSuccessAnim(true);
      setTimeout(() => {
        setSuccessAnim(false);
        toast.success('Tarea creada');
        onTareaCreated();
        if (createAnother) { resetForm(); } else { onOpenChange(false); }
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find(e => e.id === formData.empresa_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle className="font-heading flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Quick Create
          </SheetTitle>
          <SheetDescription>Crea tareas rápidamente</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className={cn("space-y-4 px-6 py-4 overflow-y-auto flex-1 transition-all", successAnim && "scale-95 opacity-50")}>
            {successAnim && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-95">
                  <div className="h-14 w-14 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-7 w-7 text-success" />
                  </div>
                </div>
              </div>
            )}

            <TemplateSelector onSelect={handleTemplateSelect} />

            {/* Título */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="¿Qué necesitas hacer?"
                maxLength={200}
                autoFocus
                className="text-base font-medium"
              />
            </div>

            {/* Empresa searchable */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Empresa *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {selectedEmpresa ? selectedEmpresa.razon_social : <span className="text-muted-foreground">Buscar empresa...</span>}
                    <Search className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <div className="p-2 border-b">
                    <Input placeholder="Filtrar..." value={empresaSearch} onChange={(e) => setEmpresaSearch(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto p-1">
                    {filteredEmpresas.map(e => (
                      <button key={e.id} type="button" onClick={() => { setFormData(prev => ({ ...prev, empresa_id: e.id })); setEmpresaSearch(''); }}
                        className={cn('w-full text-left px-3 py-2 rounded-md text-sm transition-colors', formData.empresa_id === e.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
                        {e.razon_social}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Prioridad chips */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Prioridad</Label>
              <div className="flex gap-2">
                {PRIORIDADES.map(p => (
                  <button key={p.value} type="button" onClick={() => setFormData(prev => ({ ...prev, prioridad: p.value }))}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      formData.prioridad === p.value ? cn(p.color, 'ring-1 ring-offset-1 ring-primary/30') : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick date */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Vencimiento</Label>
              <div className="flex flex-wrap gap-1.5">
                {[{ t: 'today', l: 'Hoy' }, { t: 'tomorrow', l: 'Mañana' }, { t: 'nextWeek', l: 'Próx. semana' }].map(({ t, l }) => (
                  <button key={t} type="button" onClick={() => setQuickDate(t as any)}
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
                    <Calendar mode="single" selected={formData.fecha_vencimiento ? new Date(formData.fecha_vencimiento + 'T12:00:00') : undefined}
                      onSelect={(d) => { if (d) setFormData(prev => ({ ...prev, fecha_vencimiento: format(d, 'yyyy-MM-dd') })); setDatePickerOpen(false); }}
                      className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {formData.fecha_vencimiento && (
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, fecha_vencimiento: '' }))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                )}
              </div>
            </div>

            {/* More options */}
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
                  <span>Más opciones</span>
                  <div className="flex-1 border-t border-dashed" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Descripción</Label>
                  <Textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalles..." maxLength={2000} rows={2} className="resize-none" />
                </div>
                {consultores.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Asignar a</Label>
                    <Select value={formData.consultor_asignado_id} onValueChange={(v) => setFormData({ ...formData, consultor_asignado_id: v })}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>
                        {consultores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/30">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={createAnother} onChange={(e) => setCreateAnother(e.target.checked)} className="rounded border-input" />
              Crear otra
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={loading} className="gradient-primary shadow-elegant font-heading">
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
