import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronDown, Calendar, User, Users, RefreshCw, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CatalogoMinItem {
  id: string;
  nombre: string;
  programa: string;
  presentacion: string | null;
}

const CATEGORIAS = [
  { value: 'general', label: 'Obligación General' },
  { value: 'cert_iva_ieps', label: 'Certificación IVA/IEPS' },
  { value: 'immex', label: 'Programa IMMEX' },
  { value: 'prosec', label: 'Programa PROSEC' },
  { value: 'padron', label: 'Padrón de Importadores' },
  { value: 'otro', label: 'Otro' },
];

export interface ObligacionFormData {
  id?: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  articulos: string;
  presentacion: string;
  fecha_autorizacion: string;
  fecha_vencimiento: string;
  fecha_renovacion: string;
  fecha_inicio: string;
  fecha_fin: string;
  numero_oficio: string;
  estado: string;
  notas: string;
  activa: boolean;
  responsable_tipo: string;
  responsable_id: string;
  responsable_ids: string[];
}

const EMPTY_FORM: ObligacionFormData = {
  categoria: 'general', nombre: '', descripcion: '', articulos: '', presentacion: '',
  fecha_autorizacion: '', fecha_vencimiento: '', fecha_renovacion: '',
  fecha_inicio: '', fecha_fin: '', numero_oficio: '', estado: 'vigente', notas: '',
  activa: true, responsable_tipo: '', responsable_id: '',
  responsable_ids: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ObligacionFormData) => void;
  initialData?: ObligacionFormData | null;
  loading?: boolean;
  empresaId?: string;
  onSugerirCatalogo?: (item: CatalogoMinItem) => void;
}

export function ObligacionFormDialog({ open, onOpenChange, onSubmit, initialData, loading, empresaId, onSugerirCatalogo }: Props) {
  const [form, setForm] = useState<ObligacionFormData>(EMPTY_FORM);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; tipo: string }[]>([]);
  const [datesOpen, setDatesOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<CatalogoMinItem[]>([]);
  const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false);

  useEffect(() => {
    if (open) {
      const data = initialData ? { ...EMPTY_FORM, ...initialData } : { ...EMPTY_FORM };
      if (!data.responsable_ids) data.responsable_ids = [];
      setForm(data);
      setDatesOpen(!!(data.fecha_autorizacion || data.fecha_renovacion || data.fecha_inicio || data.fecha_fin));
    }
  }, [open, initialData]);

  useEffect(() => {
    if (open && empresaId) {
      fetchUsuarios();
    }
  }, [open, empresaId]);

  // Load existing responsables when editing
  useEffect(() => {
    if (open && initialData?.id && empresaId) {
      loadExistingResponsables(initialData.id);
    }
  }, [open, initialData?.id]);

  useEffect(() => {
    if (open && !initialData?.id) {
      supabase
        .from('obligaciones_catalogo')
        .select('id, nombre, programa, presentacion')
        .eq('activo', true)
        .then(({ data }) => setCatalogo((data as CatalogoMinItem[]) || []));
    }
    if (!open) {
      setSugerenciaDescartada(false);
    }
  }, [open, initialData?.id]);

  const sugerencia = useMemo<CatalogoMinItem | null>(() => {
    if (form.nombre.length < 3 || catalogo.length === 0) return null;
    const q = form.nombre.toLowerCase();
    return catalogo.find(item => item.nombre.toLowerCase().includes(q)) ?? null;
  }, [form.nombre, catalogo]);

  const loadExistingResponsables = async (obligacionId: string) => {
    const { data } = await supabase
      .from('obligacion_responsables')
      .select('user_id')
      .eq('obligacion_id', obligacionId);
    if (data && data.length > 0) {
      setForm(prev => ({ ...prev, responsable_ids: data.map(r => r.user_id) }));
    }
  };

  const fetchUsuarios = async () => {
    if (!empresaId) return;
    try {
      const results: { id: string; nombre: string; tipo: string }[] = [];

      // Clientes: batch role check instead of N+1 queries
      const { data: clientProfiles } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .eq('empresa_id', empresaId);

      if (clientProfiles && clientProfiles.length > 0) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'cliente')
          .in('user_id', clientProfiles.map(p => p.id));
        const clientRoleIds = new Set((roleData || []).map(r => r.user_id));
        clientProfiles
          .filter(p => clientRoleIds.has(p.id))
          .forEach(p => results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'cliente' }));
      }

      // Consultores: batch profile fetch instead of N+1 queries
      const { data: consultorAssignments } = await supabase
        .from('consultor_empresa_asignacion')
        .select('consultor_id')
        .eq('empresa_id', empresaId);

      if (consultorAssignments && consultorAssignments.length > 0) {
        const { data: consultorProfiles } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorAssignments.map(a => a.consultor_id));
        (consultorProfiles || []).forEach(p =>
          results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'consultor' })
        );
      }

      setUsuarios(results);
    } catch (err) {
      console.error('Error fetching usuarios:', err);
      toast.error('Error al cargar consultores y clientes');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria) return;
    const submittedData = {
      ...form,
      activa: form.activa || !!form.fecha_vencimiento,
    };
    onSubmit(submittedData);
  };

  const update = (field: keyof ObligacionFormData, value: string | boolean | string[]) => {
    if (field === 'nombre') setSugerenciaDescartada(false);
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleResponsable = (userId: string) => {
    setForm(prev => {
      const ids = prev.responsable_ids || [];
      const newIds = ids.includes(userId)
        ? ids.filter(id => id !== userId)
        : [...ids, userId];
      return { ...prev, responsable_ids: newIds };
    });
  };

  const clientes = usuarios.filter(u => u.tipo === 'cliente');
  const consultores = usuarios.filter(u => u.tipo === 'consultor');
  const isRecurring = form.presentacion && form.presentacion !== 'unica';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {initialData?.id ? 'Editar Obligación' : 'Nueva Obligación'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Ej: Renovación Certificación IVA" required />
          </div>
          {sugerencia && !sugerenciaDescartada && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-2.5 mt-1.5">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">"{sugerencia.nombre}"</span> existe en el catálogo
                  ({sugerencia.programa}{sugerencia.presentacion ? ` · ${sugerencia.presentacion}` : ''})
                </p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900"
                    onClick={() => onSugerirCatalogo?.(sugerencia)}
                  >
                    Activar desde catálogo
                  </button>
                  <span className="text-amber-400">·</span>
                  <button
                    type="button"
                    className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800"
                    onClick={() => setSugerenciaDescartada(true)}
                  >
                    Continuar personalizada
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría *</Label>
              <Select value={form.categoria} onValueChange={v => update('categoria', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Presentación</Label>
              <Select value={form.presentacion} onValueChange={v => update('presentacion', v)}>
                <SelectTrigger><SelectValue placeholder="Periodicidad..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Artículo(s)</Label>
              <Input value={form.articulos} onChange={e => update('articulos', e.target.value)} placeholder="Ej: Art. 24 IMMEX" />
            </div>
            <div>
              <Label>Nº Oficio</Label>
              <Input value={form.numero_oficio} onChange={e => update('numero_oficio', e.target.value)} placeholder="Oficio / Número" />
            </div>
          </div>

          {/* Primary date + Responsables */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div>
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <Calendar className="w-4 h-4 text-primary" />
                Fecha de Vencimiento
                {isRecurring && (
                  <Badge variant="outline" className="ml-1 text-xs gap-1 font-normal">
                    <RefreshCw className="w-3 h-3" />
                    {form.presentacion}
                  </Badge>
                )}
              </Label>
              <Input
                type="date"
                value={form.fecha_vencimiento}
                onChange={e => update('fecha_vencimiento', e.target.value)}
                className="mt-1.5"
              />
              {isRecurring && form.fecha_vencimiento && (
                <p className="text-xs text-muted-foreground mt-1">
                  Se usará como fecha base. Los próximos vencimientos se calcularán automáticamente según la periodicidad.
                </p>
              )}
              {!form.fecha_vencimiento && (
                <p className="text-xs text-muted-foreground mt-1">
                  Al asignar fecha, la obligación se activa automáticamente.
                </p>
              )}
            </div>

            {/* Multi-select responsables */}
{usuarios.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Responsables
                  {(form.responsable_ids?.length || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {form.responsable_ids.length}
                    </Badge>
                  )}
                </Label>
                <div className="mt-2 space-y-2 max-h-[180px] overflow-y-auto">
                  {consultores.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                        <Users className="w-3 h-3" /> Consultores
                      </p>
                      {consultores.map(u => (
                        <label key={u.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={form.responsable_ids?.includes(u.id) || false}
                            onCheckedChange={() => toggleResponsable(u.id)}
                          />
                          <span className="text-sm">{u.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {clientes.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mb-1.5">
                        <User className="w-3 h-3" /> Clientes
                      </p>
                      {clientes.map(u => (
                        <label key={u.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer transition-colors">
                          <Checkbox
                            checked={form.responsable_ids?.includes(u.id) || false}
                            onCheckedChange={() => toggleResponsable(u.id)}
                          />
                          <span className="text-sm">{u.nombre}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Secondary dates (collapsible) */}
          <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                <ChevronDown className={`w-4 h-4 transition-transform ${datesOpen ? 'rotate-0' : '-rotate-90'}`} />
                Más fechas
                <span className="text-xs">(autorización, renovación, inicio, fin)</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Autorización</Label>
                  <Input type="date" value={form.fecha_autorizacion} onChange={e => update('fecha_autorizacion', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Renovación</Label>
                  <Input type="date" value={form.fecha_renovacion} onChange={e => update('fecha_renovacion', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Inicio</Label>
                  <Input type="date" value={form.fecha_inicio} onChange={e => update('fecha_inicio', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Fin</Label>
                  <Input type="date" value={form.fecha_fin} onChange={e => update('fecha_fin', e.target.value)} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div>
            <Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)} placeholder="Descripción de la obligación" rows={2} />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notas} onChange={e => update('notas', e.target.value)} placeholder="Notas adicionales" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !form.nombre.trim()}>
              {loading ? 'Guardando...' : initialData?.id ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
