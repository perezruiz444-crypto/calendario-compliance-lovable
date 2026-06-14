import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarChart3, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EditableInfoCard } from './EditableInfoCard';
import type { Empresa } from '@/types/domain';

interface EmpresaPROSECCardProps {
  empresa: Empresa;
  canEdit: boolean;
  onUpdate: () => void;
}

const emptyForm = (empresa: Empresa) => ({
  prosec_numero: empresa.prosec_numero || '',
  prosec_modalidad: empresa.prosec_modalidad || '',
  prosec_fecha_autorizacion: empresa.prosec_fecha_autorizacion || '',
  prosec_fecha_ultima_renovacion: empresa.prosec_fecha_ultima_renovacion || '',
  prosec_fecha_siguiente_renovacion: empresa.prosec_fecha_siguiente_renovacion || '',
  // prosec_sectores llega como Json desde Supabase pero siempre son strings; lo fijamos a string[].
  prosec_sectores: Array.isArray(empresa.prosec_sectores) ? empresa.prosec_sectores.map(String) : [],
});

export function EmpresaPROSECCard({ empresa, canEdit, onUpdate }: EmpresaPROSECCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm(empresa));
  const [newSector, setNewSector] = useState('');

  useEffect(() => {
    if (!isEditing) setFormData(emptyForm(empresa));
  }, [empresa.id, empresa.prosec_numero, empresa.prosec_modalidad, empresa.prosec_fecha_autorizacion, empresa.prosec_fecha_ultima_renovacion, empresa.prosec_fecha_siguiente_renovacion, empresa.prosec_sectores]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          prosec_numero: formData.prosec_numero.trim() || null,
          prosec_modalidad: formData.prosec_modalidad.trim() || null,
          prosec_fecha_autorizacion: formData.prosec_fecha_autorizacion || null,
          prosec_fecha_ultima_renovacion: formData.prosec_fecha_ultima_renovacion || null,
          prosec_fecha_siguiente_renovacion: formData.prosec_fecha_siguiente_renovacion || null,
          prosec_sectores: formData.prosec_sectores,
        })
        .eq('id', empresa.id);

      if (error) throw error;
      toast.success('PROSEC actualizado');
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

  const addSector = () => {
    if (newSector.trim()) {
      setFormData({ ...formData, prosec_sectores: [...formData.prosec_sectores, newSector.trim()] });
      setNewSector('');
    }
  };

  const removeSector = (index: number) => {
    setFormData({ ...formData, prosec_sectores: formData.prosec_sectores.filter((_, i) => i !== index) });
  };

  const sectores = Array.isArray(empresa.prosec_sectores) ? empresa.prosec_sectores.map(String) : [];
  const hasData = empresa.prosec_numero || empresa.prosec_fecha_autorizacion || empresa.prosec_fecha_siguiente_renovacion;

  return (
    <EditableInfoCard
      title="Programa PROSEC"
      icon={BarChart3}
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
                value={formData.prosec_numero}
                onChange={(e) => setFormData({ ...formData, prosec_numero: e.target.value })}
                placeholder="Ej: PROSEC-12345"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
              <Input
                value={formData.prosec_modalidad}
                onChange={(e) => setFormData({ ...formData, prosec_modalidad: e.target.value })}
                placeholder="Modalidad"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
              <Input
                type="date"
                value={formData.prosec_fecha_autorizacion}
                onChange={(e) => setFormData({ ...formData, prosec_fecha_autorizacion: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Última Renovación</label>
              <Input
                type="date"
                value={formData.prosec_fecha_ultima_renovacion}
                onChange={(e) => setFormData({ ...formData, prosec_fecha_ultima_renovacion: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Siguiente Renovación</label>
              <Input
                type="date"
                value={formData.prosec_fecha_siguiente_renovacion}
                onChange={(e) => setFormData({ ...formData, prosec_fecha_siguiente_renovacion: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-heading font-medium text-muted-foreground">Sectores</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newSector}
                onChange={(e) => setNewSector(e.target.value)}
                placeholder="Agregar sector"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSector())}
              />
              <Button type="button" size="sm" onClick={addSector}>+</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.prosec_sectores.map((s: string, i: number) => (
                <Badge key={`${s}-${i}`} variant="secondary">
                  {s}
                  <button type="button" onClick={() => removeSector(i)} className="ml-1 hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Número de Registro</label>
              <p className="font-body mt-1">{empresa.prosec_numero}</p>
            </div>
            {empresa.prosec_modalidad && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
                <p className="font-body mt-1">{empresa.prosec_modalidad}</p>
              </div>
            )}
            {empresa.prosec_fecha_autorizacion && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                <p className="font-body mt-1">
                  {new Date(empresa.prosec_fecha_autorizacion).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
            {empresa.prosec_fecha_ultima_renovacion && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Última Renovación</label>
                <p className="font-body mt-1">
                  {new Date(empresa.prosec_fecha_ultima_renovacion).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
            {empresa.prosec_fecha_siguiente_renovacion && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Siguiente Renovación</label>
                <p className="font-body mt-1">
                  {new Date(empresa.prosec_fecha_siguiente_renovacion).toLocaleDateString('es-MX')}
                </p>
              </div>
            )}
          </div>
          {sectores.length > 0 && (
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Sectores</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sectores.map((s: string, i: number) => (
                  <Badge key={`${s}-${i}`} variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground font-body">No registrado</p>
      )}
    </EditableInfoCard>
  );
}
