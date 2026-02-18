import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIAS = [
  { value: 'general', label: 'Obligación General' },
  { value: 'cert_iva_ieps', label: 'Certificación IVA/IEPS' },
  { value: 'immex', label: 'Programa IMMEX' },
  { value: 'prosec', label: 'Programa PROSEC' },
  { value: 'padron', label: 'Padrón de Importadores' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'por_vencer', label: 'Por Vencer' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'renovado', label: 'Renovado' },
  { value: 'cancelado', label: 'Cancelado' },
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
}

const EMPTY_FORM: ObligacionFormData = {
  categoria: 'general', nombre: '', descripcion: '', articulos: '', presentacion: '',
  fecha_autorizacion: '', fecha_vencimiento: '', fecha_renovacion: '',
  fecha_inicio: '', fecha_fin: '', numero_oficio: '', estado: 'vigente', notas: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ObligacionFormData) => void;
  initialData?: ObligacionFormData | null;
  loading?: boolean;
}

export function ObligacionFormDialog({ open, onOpenChange, onSubmit, initialData, loading }: Props) {
  const [form, setForm] = useState<ObligacionFormData>(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initialData ? { ...EMPTY_FORM, ...initialData } : { ...EMPTY_FORM });
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.categoria) return;
    onSubmit(form);
  };

  const update = (field: keyof ObligacionFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {initialData?.id ? 'Editar Obligación' : 'Nueva Obligación'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={e => update('nombre', e.target.value)} placeholder="Ej: Renovación Certificación IVA" required />
            </div>
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
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => update('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Artículo(s)</Label>
              <Input value={form.articulos} onChange={e => update('articulos', e.target.value)} placeholder="Ej: Art. 24 IMMEX, Regla 7.1.1" />
            </div>
            <div className="col-span-2">
              <Label>Presentación (periodicidad)</Label>
              <Select value={form.presentacion} onValueChange={v => update('presentacion', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
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
            <div>
              <Label>Número de Oficio</Label>
              <Input value={form.numero_oficio} onChange={e => update('numero_oficio', e.target.value)} placeholder="Oficio / Número" />
            </div>
            <div>
              <Label>Fecha Autorización</Label>
              <Input type="date" value={form.fecha_autorizacion} onChange={e => update('fecha_autorizacion', e.target.value)} />
            </div>
            <div>
              <Label>Fecha Vencimiento</Label>
              <Input type="date" value={form.fecha_vencimiento} onChange={e => update('fecha_vencimiento', e.target.value)} />
            </div>
            <div>
              <Label>Fecha Renovación</Label>
              <Input type="date" value={form.fecha_renovacion} onChange={e => update('fecha_renovacion', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => update('descripcion', e.target.value)} placeholder="Descripción de la obligación" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={e => update('notas', e.target.value)} placeholder="Notas adicionales" rows={2} />
            </div>
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
