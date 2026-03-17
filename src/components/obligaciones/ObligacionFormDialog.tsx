import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Calendar, User, Users, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
}

const EMPTY_FORM: ObligacionFormData = {
  categoria: 'general', nombre: '', descripcion: '', articulos: '', presentacion: '',
  fecha_autorizacion: '', fecha_vencimiento: '', fecha_renovacion: '',
  fecha_inicio: '', fecha_fin: '', numero_oficio: '', estado: 'vigente', notas: '',
  activa: false, responsable_tipo: '', responsable_id: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ObligacionFormData) => void;
  initialData?: ObligacionFormData | null;
  loading?: boolean;
  empresaId?: string;
}

export function ObligacionFormDialog({ open, onOpenChange, onSubmit, initialData, loading, empresaId }: Props) {
  const [form, setForm] = useState<ObligacionFormData>(EMPTY_FORM);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; tipo: string }[]>([]);
  const [datesOpen, setDatesOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const data = initialData ? { ...EMPTY_FORM, ...initialData } : { ...EMPTY_FORM };
      setForm(data);
      // Open secondary dates if any are filled
      setDatesOpen(!!(data.fecha_autorizacion || data.fecha_renovacion || data.fecha_inicio || data.fecha_fin));
    }
  }, [open, initialData]);

  // Fetch available users when empresaId is available and fecha_vencimiento is set
  useEffect(() => {
    if (open && form.fecha_vencimiento && empresaId) {
      fetchUsuarios();
    }
  }, [open, form.fecha_vencimiento, empresaId]);

  const fetchUsuarios = async () => {
    if (!empresaId) return;
    const results: { id: string; nombre: string; tipo: string }[] = [];

    // Get clients of this empresa
    const { data: clientProfiles } = await supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('empresa_id', empresaId);
    
    if (clientProfiles) {
      for (const p of clientProfiles) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', p.id)
          .eq('role', 'cliente')
          .maybeSingle();
        if (roleData) {
          results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'cliente' });
        }
      }
    }

    // Get consultores assigned to this empresa
    const { data: consultorAssignments } = await supabase
      .from('consultor_empresa_asignacion')
      .select('consultor_id')
      .eq('empresa_id', empresaId);

    if (consultorAssignments) {
      for (const a of consultorAssignments) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .eq('id', a.consultor_id)
          .maybeSingle();
        if (profile) {
          results.push({ id: profile.id, nombre: profile.nombre_completo, tipo: 'consultor' });
        }
      }
    }

    setUsuarios(results);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria) return;
    // Implicit activation: activa = true when fecha_vencimiento is set
    const submittedData = {
      ...form,
      activa: form.activa || !!form.fecha_vencimiento,
    };
    onSubmit(submittedData);
  };

  const update = (field: keyof ObligacionFormData, value: string | boolean) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      return updated;
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
          {/* ── Core fields ── */}
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Ej: Renovación Certificación IVA" required />
          </div>

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

          {/* ── Primary date: Fecha de Vencimiento ── */}
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

            {/* ── Responsable (visible only when fecha_vencimiento is set) ── */}
            {form.fecha_vencimiento && (
              <div className="pt-2 border-t border-border/50">
                <Label className="text-xs font-medium">Responsable</Label>
                <Select
                  value={form.responsable_id || '__none__'}
                  onValueChange={v => {
                    if (v === '__none__') {
                      update('responsable_id', '');
                      update('responsable_tipo', '');
                    } else {
                      const found = usuarios.find(u => u.id === v);
                      if (found) {
                        setForm(prev => ({ ...prev, responsable_id: v, responsable_tipo: found.tipo }));
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin asignar</SelectItem>
                    {consultores.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-1.5">
                          <Users className="w-3 h-3" /> Consultores
                        </SelectLabel>
                        {consultores.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {clientes.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="flex items-center gap-1.5">
                          <User className="w-3 h-3" /> Clientes
                        </SelectLabel>
                        {clientes.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ── Secondary dates (collapsible) ── */}
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

          {/* ── Description & Notes ── */}
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