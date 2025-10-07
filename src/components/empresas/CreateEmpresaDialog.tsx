import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { empresaSchema } from '@/lib/validation';
import { z } from 'zod';
import EmpresaFormGeneral from './EmpresaFormGeneral';

interface CreateEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaCreated: () => void;
}

export default function CreateEmpresaDialog({ open, onOpenChange, onEmpresaCreated }: CreateEmpresaDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: '',
    rfc: '',
    domicilio_fiscal: '',
    telefono: '',
    actividad_economica: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form data
    try {
      empresaSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Por favor corrige los errores en el formulario');
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('empresas')
        .insert({
          razon_social: formData.razon_social.trim(),
          rfc: formData.rfc.trim().toUpperCase(),
          domicilio_fiscal: formData.domicilio_fiscal.trim(),
          telefono: formData.telefono.trim() || null,
          actividad_economica: formData.actividad_economica.trim() || null,
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Empresa creada exitosamente');
      setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '' });
      onOpenChange(false);
      onEmpresaCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Nueva Empresa</DialogTitle>
          <DialogDescription className="font-body">
            Ingresa los datos básicos de la empresa
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <EmpresaFormGeneral 
              formData={formData} 
              setFormData={setFormData}
              errors={errors}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
              {loading ? 'Creando...' : 'Crear Empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
