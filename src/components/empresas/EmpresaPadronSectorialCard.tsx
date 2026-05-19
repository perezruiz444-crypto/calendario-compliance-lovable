import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tags, Pencil, X, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Registro {
  id: string;
  activo: boolean;
  fecha_inicio: string | null;
  sectores: string[] | null;
}

interface EmpresaPadronSectorialCardProps {
  empresaId: string;
  canEdit: boolean;
}

export function EmpresaPadronSectorialCard({ empresaId, canEdit }: EmpresaPadronSectorialCardProps) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSector, setNewSector] = useState('');
  const [newFecha, setNewFecha] = useState('');

  const fetchRegistros = async () => {
    const { data } = await supabase
      .from('empresa_programas')
      .select('id, activo, fecha_inicio, sectores')
      .eq('empresa_id', empresaId)
      .eq('programa', 'padron_sectorial')
      .eq('activo', true)
      .order('fecha_inicio');
    setRegistros((data || []) as Registro[]);
  };

  useEffect(() => { fetchRegistros(); }, [empresaId]);

  const handleAddSector = async () => {
    if (!newSector.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresa_programas')
        .insert({
          empresa_id: empresaId,
          programa: 'padron_sectorial',
          activo: true,
          fecha_inicio: newFecha || null,
          sectores: [newSector.trim()],
        });
      if (error) throw error;
      toast.success('Sector agregado');
      setNewSector('');
      setNewFecha('');
      fetchRegistros();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSector = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresa_programas')
        .update({ activo: false })
        .eq('id', id);
      if (error) throw error;
      toast.success('Sector eliminado');
      fetchRegistros();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          <Tags className="w-5 h-5" />
          Padrón Sectorial
        </CardTitle>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {registros.length === 0 && !isEditing ? (
          <p className="text-muted-foreground font-body">No registrado</p>
        ) : (
          <div className="space-y-3">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2">
                <div>
                  {r.sectores && r.sectores.length > 0 && (
                    <Badge variant="outline" className="mb-1">{r.sectores[0]}</Badge>
                  )}
                  {r.fecha_inicio && (
                    <p className="text-xs text-muted-foreground">
                      Alta: {format(new Date(r.fecha_inicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  )}
                </div>
                {isEditing && canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    disabled={isSaving}
                    onClick={() => handleRemoveSector(r.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {isEditing && (
              <div className="border-t pt-3 space-y-2">
                <label className="text-sm font-heading font-medium text-muted-foreground">Agregar sector</label>
                <Input
                  placeholder="Ej: 11 textil y confección"
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                />
                <Input
                  type="date"
                  value={newFecha}
                  onChange={(e) => setNewFecha(e.target.value)}
                />
                <Button size="sm" onClick={handleAddSector} disabled={isSaving || !newSector.trim()} className="w-full">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Agregar</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
