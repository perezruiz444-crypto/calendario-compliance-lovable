import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardList, Pencil, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmpresaPadronGeneralCardProps {
  empresaId: string;
  canEdit: boolean;
}

interface Registro {
  id: string;
  activo: boolean;
  fecha_inicio: string | null;
}

export function EmpresaPadronGeneralCard({ empresaId, canEdit }: EmpresaPadronGeneralCardProps) {
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');

  const fetchRegistro = async () => {
    const { data } = await supabase
      .from('empresa_programas')
      .select('id, activo, fecha_inicio')
      .eq('empresa_id', empresaId)
      .eq('programa', 'padron_general')
      .maybeSingle();
    setRegistro(data as Registro | null);
    setFechaInicio(data?.fecha_inicio || '');
  };

  useEffect(() => { fetchRegistro(); }, [empresaId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (registro) {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ fecha_inicio: fechaInicio || null })
          .eq('id', registro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('empresa_programas')
          .insert({ empresa_id: empresaId, programa: 'padron_general', activo: true, fecha_inicio: fechaInicio || null });
        if (error) throw error;
      }
      toast.success('Padrón General actualizado');
      setIsEditing(false);
      fetchRegistro();
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
          <ClipboardList className="w-5 h-5" />
          Padrón General
        </CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gradient-primary">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Alta</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        ) : registro?.activo ? (
          <div className="grid grid-cols-2 gap-4">
            {registro.fecha_inicio && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Alta</label>
                <p className="font-body mt-1">
                  {new Date(registro.fecha_inicio + 'T12:00:00').toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground font-body">No registrado</p>
        )}
      </CardContent>
    </Card>
  );
}
