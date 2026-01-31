import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ship, Pencil, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MODALIDADES = ['Industrial', 'Maquila', 'Servicios', 'Albergue', 'Terciarización'];

interface EmpresaIMMEXCardProps {
  empresa: any;
  canEdit: boolean;
  onUpdate: () => void;
}

export function EmpresaIMMEXCard({ empresa, canEdit, onUpdate }: EmpresaIMMEXCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    immex_numero: empresa.immex_numero || '',
    immex_modalidad: empresa.immex_modalidad || empresa.immex_tipo || '',
    immex_fecha_autorizacion: empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio || ''
  });

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
    setFormData({
      immex_numero: empresa.immex_numero || '',
      immex_modalidad: empresa.immex_modalidad || empresa.immex_tipo || '',
      immex_fecha_autorizacion: empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio || ''
    });
    setIsEditing(false);
  };

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Programa IMMEX
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
        ) : empresa.immex_numero ? (
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
      </CardContent>
    </Card>
  );
}
