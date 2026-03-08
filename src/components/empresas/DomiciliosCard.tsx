import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface DomiciliosCardProps {
  empresaId: string;
  domicilios: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

export function DomiciliosCard({ empresaId, domicilios, canEdit, onUpdate }: DomiciliosCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ domicilio: '', tipo: '' });

  const startEdit = (d: any) => {
    setEditingId(d.id);
    setForm({ domicilio: d.domicilio, tipo: d.tipo || '' });
  };

  const startAdd = () => { setAdding(true); setForm({ domicilio: '', tipo: '' }); };
  const cancel = () => { setEditingId(null); setAdding(false); };

  const handleSave = async () => {
    if (!form.domicilio.trim()) { toast.error('El domicilio es requerido'); return; }
    setSaving(true);
    try {
      const payload = { domicilio: form.domicilio.trim(), tipo: form.tipo || null };
      if (adding) {
        const { error } = await supabase.from('domicilios_operacion').insert({ ...payload, empresa_id: empresaId });
        if (error) throw error;
        toast.success('Domicilio agregado');
      } else if (editingId) {
        const { error } = await supabase.from('domicilios_operacion').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Domicilio actualizado');
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
      const { error } = await supabase.from('domicilios_operacion').delete().eq('id', id);
      if (error) throw error;
      toast.success('Domicilio eliminado');
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const renderForm = () => (
    <div className="space-y-3 p-3 border rounded-lg bg-accent/30">
      <Input placeholder="Dirección completa" value={form.domicilio} onChange={e => setForm(p => ({ ...p, domicilio: e.target.value }))} />
      <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
        <SelectTrigger><SelectValue placeholder="Tipo de domicilio" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="planta">Planta</SelectItem>
          <SelectItem value="bodega">Bodega</SelectItem>
          <SelectItem value="oficina">Oficina</SelectItem>
          <SelectItem value="sucursal">Sucursal</SelectItem>
          <SelectItem value="otro">Otro</SelectItem>
        </SelectContent>
      </Select>
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
            <MapPin className="w-5 h-5" />
            Domicilios de Operación
          </CardTitle>
          <CardDescription>{domicilios.length} domicilio(s)</CardDescription>
        </div>
        {canEdit && !adding && (
          <Button variant="ghost" size="sm" onClick={startAdd}><Plus className="w-4 h-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && renderForm()}
        {domicilios.map((d) =>
          editingId === d.id ? (
            <div key={d.id}>{renderForm()}</div>
          ) : (
            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg group">
              <div>
                {d.tipo && <Badge variant="outline" className="mb-1 text-xs capitalize">{d.tipo}</Badge>}
                <p className="text-sm">{d.domicilio}</p>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          )
        )}
        {domicilios.length === 0 && !adding && (
          <p className="text-muted-foreground text-center py-4 text-sm">Sin domicilios adicionales</p>
        )}
      </CardContent>
    </Card>
  );
}
