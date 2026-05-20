import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ship } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditableInfoCard } from './EditableInfoCard';
import type { Empresa } from '@/types/domain';

const MODALIDADES = ['Industrial', 'Maquila', 'Servicios', 'Albergue', 'Terciarización'];

interface EmpresaIMMEXCardProps {
  empresa: Empresa;
  canEdit: boolean;
  onUpdate: () => void;
}

// `immex_tipo` y `immex_fecha_inicio` son campos legacy mantenidos como fallback
// para empresas creadas antes de la migración a `immex_modalidad`/`immex_fecha_autorizacion`.
// Al editar, solo se escribe en los campos nuevos; los legacy se leen pero no se escriben.
const emptyForm = (empresa: Empresa) => ({
  immex_numero: empresa.immex_numero || '',
  immex_modalidad: empresa.immex_modalidad || empresa.immex_tipo || '',
  immex_fecha_autorizacion: empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio || ''
});

export function EmpresaIMMEXCard({ empresa, canEdit, onUpdate }: EmpresaIMMEXCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm(empresa));

  useEffect(() => {
    if (!isEditing) setFormData(emptyForm(empresa));
  }, [empresa.id, empresa.immex_numero, empresa.immex_modalidad, empresa.immex_tipo, empresa.immex_fecha_autorizacion, empresa.immex_fecha_inicio]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          immex_numero: formData.immex_numero.trim() || null,
          immex_modalidad: formData.immex_modalidad || null,
          immex_fecha_autorizacion: formData.immex_fecha_autorizacion || null
        })
        .eq('id', empresa.id);

      if (error) throw error;
      toast.success('IMMEX actualizado');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(emptyForm(empresa));
    setIsEditing(false);
  };

  const hasData = empresa.immex_numero || empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio || empresa.immex_modalidad;

  return (
    <EditableInfoCard
      title="Programa IMMEX"
      icon={Ship}
      canEdit={canEdit}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={() => setIsEditing(true)}
      onCancel={handleCancel}
      onSave={handleSave}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Número de Registro</label>
              <Input
                value={formData.immex_numero}
                onChange={(e) => setFormData({ ...formData, immex_numero: e.target.value })}
                placeholder="Ej: IMMEX-12345"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
              <Select
                value={formData.immex_modalidad}
                onValueChange={(value) => setFormData({ ...formData, immex_modalidad: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccionar modalidad" />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES.map((mod) => (
                    <SelectItem key={mod} value={mod.toLowerCase()}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
            <Input
              type="date"
              value={formData.immex_fecha_autorizacion}
              onChange={(e) => setFormData({ ...formData, immex_fecha_autorizacion: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Número de Registro</label>
              <p className="font-body mt-1">{empresa.immex_numero}</p>
            </div>
            {(empresa.immex_modalidad || empresa.immex_tipo) && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
                <p className="font-body mt-1 capitalize">{empresa.immex_modalidad || empresa.immex_tipo}</p>
              </div>
            )}
            {(empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio) && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                <p className="font-body mt-1">
                  {new Date(empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground font-body">No registrado</p>
      )}
    </EditableInfoCard>
  );
}
