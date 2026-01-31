import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Pencil, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmpresaCertificacionCardProps {
  empresa: any;
  canEdit: boolean;
  onUpdate: () => void;
}

export function EmpresaCertificacionCard({ empresa, canEdit, onUpdate }: EmpresaCertificacionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    cert_iva_ieps_oficio: empresa.cert_iva_ieps_oficio || '',
    cert_iva_ieps_fecha_autorizacion: empresa.cert_iva_ieps_fecha_autorizacion || '',
    cert_iva_ieps_fecha_ultima_renovacion: empresa.cert_iva_ieps_fecha_ultima_renovacion || '',
    cert_iva_ieps_fecha_vencimiento: empresa.cert_iva_ieps_fecha_vencimiento || '',
    cert_iva_ieps_fecha_renovar: empresa.cert_iva_ieps_fecha_renovar || '',
    cert_iva_ieps_nota: empresa.cert_iva_ieps_nota || ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          cert_iva_ieps_oficio: formData.cert_iva_ieps_oficio.trim() || null,
          cert_iva_ieps_fecha_autorizacion: formData.cert_iva_ieps_fecha_autorizacion || null,
          cert_iva_ieps_fecha_ultima_renovacion: formData.cert_iva_ieps_fecha_ultima_renovacion || null,
          cert_iva_ieps_fecha_vencimiento: formData.cert_iva_ieps_fecha_vencimiento || null,
          cert_iva_ieps_fecha_renovar: formData.cert_iva_ieps_fecha_renovar || null,
          cert_iva_ieps_nota: formData.cert_iva_ieps_nota.trim() || null
        })
        .eq('id', empresa.id);

      if (error) throw error;

      toast.success('Certificación actualizada');
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
      cert_iva_ieps_oficio: empresa.cert_iva_ieps_oficio || '',
      cert_iva_ieps_fecha_autorizacion: empresa.cert_iva_ieps_fecha_autorizacion || '',
      cert_iva_ieps_fecha_ultima_renovacion: empresa.cert_iva_ieps_fecha_ultima_renovacion || '',
      cert_iva_ieps_fecha_vencimiento: empresa.cert_iva_ieps_fecha_vencimiento || '',
      cert_iva_ieps_fecha_renovar: empresa.cert_iva_ieps_fecha_renovar || '',
      cert_iva_ieps_nota: empresa.cert_iva_ieps_nota || ''
    });
    setIsEditing(false);
  };

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Certificación IVA e IEPS
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
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Oficio de Autorización</label>
              <Input
                value={formData.cert_iva_ieps_oficio}
                onChange={(e) => setFormData({ ...formData, cert_iva_ieps_oficio: e.target.value })}
                placeholder="Número de oficio"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                <Input
                  type="date"
                  value={formData.cert_iva_ieps_fecha_autorizacion}
                  onChange={(e) => setFormData({ ...formData, cert_iva_ieps_fecha_autorizacion: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Última Renovación</label>
                <Input
                  type="date"
                  value={formData.cert_iva_ieps_fecha_ultima_renovacion}
                  onChange={(e) => setFormData({ ...formData, cert_iva_ieps_fecha_ultima_renovacion: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Vencimiento</label>
                <Input
                  type="date"
                  value={formData.cert_iva_ieps_fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, cert_iva_ieps_fecha_vencimiento: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Fecha para Renovar</label>
                <Input
                  type="date"
                  value={formData.cert_iva_ieps_fecha_renovar}
                  onChange={(e) => setFormData({ ...formData, cert_iva_ieps_fecha_renovar: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Nota</label>
              <Textarea
                value={formData.cert_iva_ieps_nota}
                onChange={(e) => setFormData({ ...formData, cert_iva_ieps_nota: e.target.value })}
                placeholder="Notas adicionales"
                className="mt-1"
              />
            </div>
          </div>
        ) : empresa.cert_iva_ieps_oficio ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-heading font-medium text-muted-foreground">Oficio de Autorización</label>
              <p className="font-body mt-1">{empresa.cert_iva_ieps_oficio}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {empresa.cert_iva_ieps_fecha_autorizacion && (
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                  <p className="font-body mt-1">
                    {new Date(empresa.cert_iva_ieps_fecha_autorizacion).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
              {empresa.cert_iva_ieps_fecha_ultima_renovacion && (
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Última Renovación</label>
                  <p className="font-body mt-1">
                    {new Date(empresa.cert_iva_ieps_fecha_ultima_renovacion).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
              {empresa.cert_iva_ieps_fecha_vencimiento && (
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Vencimiento</label>
                  <p className="font-body mt-1">
                    {new Date(empresa.cert_iva_ieps_fecha_vencimiento).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
              {empresa.cert_iva_ieps_fecha_renovar && (
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Fecha para Renovar</label>
                  <p className="font-body mt-1">
                    {new Date(empresa.cert_iva_ieps_fecha_renovar).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
            </div>
            {empresa.cert_iva_ieps_nota && (
              <div>
                <label className="text-sm font-heading font-medium text-muted-foreground">Nota</label>
                <p className="font-body mt-1">{empresa.cert_iva_ieps_nota}</p>
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
