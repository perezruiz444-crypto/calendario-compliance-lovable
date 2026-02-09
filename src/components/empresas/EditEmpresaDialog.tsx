import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EmpresaFormGeneral from './EmpresaFormGeneral';
import EmpresaFormIMMEX from './EmpresaFormIMMEX';
import EmpresaFormPROSEC from './EmpresaFormPROSEC';
import EmpresaFormCertificacion from './EmpresaFormCertificacion';
import EmpresaFormApoderados from './EmpresaFormApoderados';
import EmpresaFormMatrizSeguridad from './EmpresaFormMatrizSeguridad';
import EmpresaFormPadronImportadores from './EmpresaFormPadronImportadores';
import EmpresaFormAgentesAduanales from './EmpresaFormAgentesAduanales';
interface EditEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaUpdated: () => void;
  empresaId: string;
}

export default function EditEmpresaDialog({ open, onOpenChange, onEmpresaUpdated, empresaId }: EditEmpresaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (open && empresaId) {
      fetchEmpresaData();
    }
  }, [open, empresaId]);

  const fetchEmpresaData = async () => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .maybeSingle();

    if (error) {
      toast.error('Error al cargar datos de la empresa');
      console.error(error);
    } else if (!data) {
      toast.error('Empresa no encontrada');
      onOpenChange(false);
    } else {
      setFormData(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('empresas')
        .update({
          razon_social: formData.razon_social?.trim(),
          rfc: formData.rfc?.trim().toUpperCase(),
          actividad_economica: formData.actividad_economica?.trim() || null,
          domicilio_fiscal: formData.domicilio_fiscal?.trim(),
          telefono: formData.telefono?.trim() || null,
          immex_numero: formData.immex_numero?.trim() || null,
          immex_modalidad: formData.immex_modalidad?.trim() || null,
          immex_fecha_autorizacion: formData.immex_fecha_autorizacion || null,
          prosec_numero: formData.prosec_numero?.trim() || null,
          prosec_modalidad: formData.prosec_modalidad?.trim() || null,
          prosec_fecha_autorizacion: formData.prosec_fecha_autorizacion || null,
          prosec_sectores: formData.prosec_sectores || [],
          cert_iva_ieps_oficio: formData.cert_iva_ieps_oficio?.trim() || null,
          cert_iva_ieps_fecha_autorizacion: formData.cert_iva_ieps_fecha_autorizacion || null,
          cert_iva_ieps_fecha_ultima_renovacion: formData.cert_iva_ieps_fecha_ultima_renovacion || null,
          cert_iva_ieps_fecha_vencimiento: formData.cert_iva_ieps_fecha_vencimiento || null,
          cert_iva_ieps_fecha_renovar: formData.cert_iva_ieps_fecha_renovar || null,
          cert_iva_ieps_nota: formData.cert_iva_ieps_nota?.trim() || null,
          matriz_seguridad_fecha_vencimiento: formData.matriz_seguridad_fecha_vencimiento || null,
          matriz_seguridad_fecha_renovar: formData.matriz_seguridad_fecha_renovar || null,
          padron_importadores_sectores: formData.padron_importadores_sectores || []
        })
        .eq('id', empresaId);

      if (error) throw error;

      toast.success('Empresa actualizada exitosamente');
      onOpenChange(false);
      onEmpresaUpdated();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Editar Empresa</DialogTitle>
          <DialogDescription className="font-body">
            Actualiza la información de la empresa
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="immex">IMMEX</TabsTrigger>
              <TabsTrigger value="prosec">PROSEC</TabsTrigger>
              <TabsTrigger value="certificacion">Certificación</TabsTrigger>
              <TabsTrigger value="apoderados">Apoderados</TabsTrigger>
              <TabsTrigger value="agentes">Agentes</TabsTrigger>
              <TabsTrigger value="matriz">Matriz</TabsTrigger>
              <TabsTrigger value="padron">Padrón</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="general">
                <EmpresaFormGeneral formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="immex">
                <EmpresaFormIMMEX formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="prosec">
                <EmpresaFormPROSEC formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="certificacion">
                <EmpresaFormCertificacion formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="apoderados">
                <EmpresaFormApoderados empresaId={empresaId} />
              </TabsContent>

              <TabsContent value="agentes">
                <EmpresaFormAgentesAduanales empresaId={empresaId} />
              </TabsContent>

              <TabsContent value="matriz">
                <EmpresaFormMatrizSeguridad formData={formData} setFormData={setFormData} />
              </TabsContent>

              <TabsContent value="padron">
                <EmpresaFormPadronImportadores formData={formData} setFormData={setFormData} />
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}