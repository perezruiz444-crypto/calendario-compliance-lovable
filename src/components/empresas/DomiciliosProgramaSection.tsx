import { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Check, X, Loader2, Pencil } from 'lucide-react';

export type ProgramaDomicilio =
  | 'immex'
  | 'prosec'
  | 'certificacion_iva_ieps'
  | 'padron_general'
  | 'padron_sectorial';

interface DomicilioRow {
  id: string;
  domicilio: string;
}

interface DomiciliosProgramaSectionProps {
  empresaId: string;
  programa: ProgramaDomicilio;
  canEdit: boolean;
  label?: string;
}

/**
 * Lista de domicilios autorizados asociada a un programa de fomento concreto.
 * Se guarda en `domicilios_operacion` con la columna `programa`.
 * Los domicilios generales (programa NULL) se siguen administrando en DomiciliosCard.
 */
export function DomiciliosProgramaSection({
  empresaId,
  programa,
  canEdit,
  label = 'Domicilios autorizados',
}: DomiciliosProgramaSectionProps) {
  const [rows, setRows] = useState<DomicilioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('domicilios_operacion')
      .select('id, domicilio')
      .eq('empresa_id', empresaId)
      .eq('programa', programa)
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('No se pudieron cargar los domicilios.');
    } else {
      setRows((data || []) as DomicilioRow[]);
    }
    setLoading(false);
  }, [empresaId, programa]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const cancel = () => { setAdding(false); setEditingId(null); setValue(''); };

  const handleSave = async () => {
    const domicilio = value.trim();
    if (!domicilio) { toast.error('Escribe una dirección.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('domicilios_operacion')
          .update({ domicilio })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Dirección actualizada');
      } else {
        const { error } = await supabase
          .from('domicilios_operacion')
          .insert({ empresa_id: empresaId, domicilio, programa });
        if (error) throw error;
        toast.success('Dirección agregada');
      }
      cancel();
      fetchRows();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('domicilios_operacion').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Dirección eliminada');
    fetchRows();
  };

  return (
    <div className="pt-4 mt-4 border-t">
      <div className="flex items-center justify-between">
        <label className="text-sm font-heading font-medium text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {label}
        </label>
        {canEdit && !adding && !editingId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Agregar dirección"
            onClick={() => { setAdding(true); setValue(''); }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <>
            {rows.map((d) =>
              editingId === d.id ? (
                <div key={d.id} className="flex gap-2">
                  <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Dirección completa" />
                  <Button type="button" variant="ghost" size="icon" onClick={cancel} disabled={saving}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" onClick={handleSave} disabled={saving} className="gradient-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <div key={d.id} className="group flex items-start justify-between gap-2 rounded-md border p-2">
                  <p className="font-body text-sm">{d.domicilio}</p>
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button" variant="ghost" size="icon" className="h-7 w-7"
                        aria-label="Editar dirección"
                        onClick={() => { setEditingId(d.id); setAdding(false); setValue(d.domicilio); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        aria-label="Eliminar dirección"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}

            {adding && (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Dirección completa"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
                />
                <Button type="button" variant="ghost" size="icon" onClick={cancel} disabled={saving}>
                  <X className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" onClick={handleSave} disabled={saving} className="gradient-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </div>
            )}

            {rows.length === 0 && !adding && (
              <p className="text-sm text-muted-foreground">Sin domicilios registrados</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
