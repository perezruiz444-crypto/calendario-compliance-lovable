import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Hash, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

interface AgentesAduanalesCardProps {
  empresaId: string;
  agentes: any[];
  canEdit: boolean;
  onUpdate: () => void;
}

export function AgentesAduanalesCard({ empresaId, agentes, canEdit, onUpdate }: AgentesAduanalesCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre_agente: '', numero_patente: '', estado: '' });

  const startEdit = (agente: any) => {
    setEditingId(agente.id);
    setForm({ nombre_agente: agente.nombre_agente, numero_patente: agente.numero_patente, estado: agente.estado || '' });
  };

  const startAdd = () => {
    setAdding(true);
    setForm({ nombre_agente: '', numero_patente: '', estado: '' });
  };

  const cancel = () => { setEditingId(null); setAdding(false); };

  const handleSave = async () => {
    if (!form.nombre_agente.trim() || !form.numero_patente.trim()) {
      toast.error('Nombre y patente son requeridos');
      return;
    }
    setSaving(true);
    try {
      if (adding) {
        const { error } = await supabase.from('agentes_aduanales').insert({
          empresa_id: empresaId,
          nombre_agente: form.nombre_agente.trim(),
          numero_patente: form.numero_patente.trim(),
          estado: form.estado.trim() || null,
        });
        if (error) throw error;
        toast.success('Agente agregado');
      } else if (editingId) {
        const { error } = await supabase.from('agentes_aduanales').update({
          nombre_agente: form.nombre_agente.trim(),
          numero_patente: form.numero_patente.trim(),
          estado: form.estado.trim() || null,
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Agente actualizado');
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
      const { error } = await supabase.from('agentes_aduanales').delete().eq('id', id);
      if (error) throw error;
      toast.success('Agente eliminado');
      onUpdate();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
    }
  };

  const renderForm = () => (
    <div className="space-y-3 p-3 border rounded-lg bg-accent/30">
      <Input placeholder="Nombre del agente" value={form.nombre_agente} onChange={e => setForm(p => ({ ...p, nombre_agente: e.target.value }))} />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="No. de patente" value={form.numero_patente} onChange={e => setForm(p => ({ ...p, numero_patente: e.target.value }))} />
        <Input placeholder="Estado (opcional)" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} />
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
            <Hash className="w-5 h-5" />
            Agentes Aduanales
          </CardTitle>
          <CardDescription>{agentes.length} agente(s)</CardDescription>
        </div>
        {canEdit && !adding && (
          <Button variant="ghost" size="sm" onClick={startAdd}><Plus className="w-4 h-4" /></Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {adding && renderForm()}
        {agentes.map((agente) =>
          editingId === agente.id ? (
            <div key={agente.id}>{renderForm()}</div>
          ) : (
            <div key={agente.id} className="flex items-center justify-between p-3 border rounded-lg group">
              <div>
                <p className="font-medium">{agente.nombre_agente}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">Patente: {agente.numero_patente}</Badge>
                  {agente.estado && <Badge variant="secondary" className="text-xs">{agente.estado}</Badge>}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(agente)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(agente.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
          )
        )}
        {agentes.length === 0 && !adding && (
          <p className="text-muted-foreground text-center py-4 text-sm">Sin agentes registrados</p>
        )}
      </CardContent>
    </Card>
  );
}
