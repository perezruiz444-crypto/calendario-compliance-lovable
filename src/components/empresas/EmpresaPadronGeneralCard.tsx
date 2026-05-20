import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditableInfoCard } from './EditableInfoCard';

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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchRegistro = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('empresa_programas')
      .select('id, activo, fecha_inicio')
      .eq('empresa_id', empresaId)
      .eq('programa', 'padron_general')
      .maybeSingle();
    if (error) {
      setFetchError(error.message);
      setRegistro(null);
    } else {
      setRegistro(data as Registro | null);
      setFechaInicio(data?.fecha_inicio || '');
    }
    setLoading(false);
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
    <EditableInfoCard
      title="Padrón General"
      icon={ClipboardList}
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={() => setIsEditing(true)}
      onCancel={() => { setIsEditing(false); setFechaInicio(registro?.fecha_inicio || ''); }}
      onSave={handleSave}
    >
      {loading ? (
        <p className="text-muted-foreground font-body text-sm">Cargando...</p>
      ) : fetchError ? (
        <p className="text-destructive font-body text-sm">Error: {fetchError}</p>
      ) : isEditing ? (
        <div>
          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Alta</label>
          <Input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-1"
          />
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
    </EditableInfoCard>
  );
}
