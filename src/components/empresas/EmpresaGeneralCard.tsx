import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Pencil, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmpresaGeneralCardProps {
  empresa: any;
  canEdit: boolean;
  onUpdate: () => void;
}

export function EmpresaGeneralCard({ empresa, canEdit, onUpdate }: EmpresaGeneralCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: empresa.razon_social || '',
    rfc: empresa.rfc || '',
    actividad_economica: empresa.actividad_economica || '',
    domicilio_fiscal: empresa.domicilio_fiscal || '',
    telefono: empresa.telefono || ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          razon_social: formData.razon_social.trim(),
          rfc: formData.rfc.trim().toUpperCase(),
          actividad_economica: formData.actividad_economica.trim() || null,
          domicilio_fiscal: formData.domicilio_fiscal.trim(),
          telefono: formData.telefono.trim() || null
        })
        .eq('id', empresa.id);

      if (error) throw error;

      toast.success('Información actualizada');
      setIsEditing(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      razon_social: empresa.razon_social || '',
      rfc: empresa.rfc || '',
      actividad_economica: empresa.actividad_economica || '',
      domicilio_fiscal: empresa.domicilio_fiscal || '',
      telefono: empresa.telefono || ''
    });
    setIsEditing(false);
  };

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Información General
        </CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
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
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Razón Social</label>
              <Input
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">RFC</label>
              <Input
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Actividad Económica</label>
              <Input
                value={formData.actividad_economica}
                onChange={(e) => setFormData({ ...formData, actividad_economica: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</label>
              <Input
                value={formData.domicilio_fiscal}
                onChange={(e) => setFormData({ ...formData, domicilio_fiscal: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Teléfono</label>
              <Input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="mt-1"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Razón Social</label>
              <p className="font-body mt-1">{empresa.razon_social}</p>
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">RFC</label>
              <p className="font-body mt-1">{empresa.rfc}</p>
            </div>
            {empresa.actividad_economica && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Actividad Económica</label>
                <p className="font-body mt-1">{empresa.actividad_economica}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</label>
              <p className="font-body mt-1">{empresa.domicilio_fiscal}</p>
            </div>
            {empresa.telefono && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Teléfono</label>
                <p className="font-body mt-1">{empresa.telefono}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
