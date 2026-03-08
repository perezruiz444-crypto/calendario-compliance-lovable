import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface ApoderadosCardProps {
  empresaId: string;
  apoderados: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

export function ApoderadosCard({ empresaId, apoderados, canEdit, onUpdate }: ApoderadosCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '', tipo_apoderado: '', poder_notarial_instrumento: '', poder_notarial_libro: '', poder_notarial_anio: '',
  });

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      nombre: a.nombre,
      tipo_apoderado: a.tipo_apoderado || '',
      poder_notarial_instrumento: a.poder_notarial_instrumento || '',
      poder_notarial_libro: a.poder_notarial_libro || '',
      poder_notarial_anio: a.poder_notarial_anio?.toString() || '',
    });
  };

  const startAdd = () => {
    setAdding(true);
    setForm({ nombre: '', tipo_apoderado: '', poder_notarial_instrumento: '', poder_notarial_libro: '', poder_notarial_anio: '' });
  };

  const cancel = () => { setEditingId(null); setAdding(false); };

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        tipo_apoderado: form.tipo_apoderado || null,
        poder_notarial_instrumento: form.poder_notarial_instrumento.trim() || null,
        poder_notarial_libro: form.poder_notarial_libro.trim() || null,
        poder_notarial_anio: form.poder_notarial_anio ? parseInt(form.poder_notarial_anio) : null,
      };
      if (adding) {
        const { error } = await supabase.from('apoderados_legales').insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
        toast.success('Apoderado agregado');
      } else if (editingId) {
        const { error } = await supabase.from('apoderados_legales').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Apoderado actualizado');
      }
      cancel();
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('apoderados_legales').delete().eq('id', id);
      if (error) throw error;
      toast.success('Apoderado eliminado');
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const renderForm = () => (
    <div className="space-y-3 p-3 border rounded-lg bg-accent/30">
      <Input placeholder="Nombre completo" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.tipo_apoderado} onValueChange={v => setForm(p => ({ ...p, tipo_apoderado: v }))}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="especial">Especial</SelectItem>
            <SelectItem value="limitado">Limitado</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Año poder" type="number" value={form.poder_notarial_anio} onChange={e => setForm(p => ({ ...p, poder_notarial_anio: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="No. instrumento" value={form.poder_notarial_instrumento} onChange={e => setForm(p => ({ ...p, poder_notarial_instrumento: e.target.value }))} />
        <Input placeholder="Libro" value={form.poder_notarial_libro} onChange={e => setForm(p => ({ ...p, poder_notarial_libro: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}><X className="w-4 h-4" /></Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="font-heading flex items-center gap-2">
            <Users className="w-5 h-5" />
            Apoderados Legales
          </CardTitle>
          <CardDescription>{apoderados.length} apoderado(s)</CardDescription>
        </div>
        {canEdit && !adding && (
          <Button variant="ghost" size="sm" onClick={startAdd}><Plus className="w-4 h-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && renderForm()}
        {apoderados.map((a) =>
          editingId === a.id ? (
            <div key={a.id}>{renderForm()}</div>
          ) : (
            <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg group">
              <div>
                <p className="font-medium">{a.nombre}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {a.tipo_apoderado && <Badge variant="outline" className="text-xs capitalize">{a.tipo_apoderado}</Badge>}
                  {a.poder_notarial_instrumento && <Badge variant="secondary" className="text-xs">Inst. {a.poder_notarial_instrumento}</Badge>}
                  {a.poder_notarial_anio && <Badge variant="secondary" className="text-xs">{a.poder_notarial_anio}</Badge>}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          )
        )}
        {apoderados.length === 0 && !adding && (
          <p className="text-muted-foreground text-center py-4 text-sm">Sin apoderados registrados</p>
        )}
      </CardContent>
    </Card>
  );
}
