import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { empresaSchema } from '@/lib/validation';
import { z } from 'zod';

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
    telefono: ''
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
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Empresa creada exitosamente');
      setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '' });
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social" className="font-heading">Razón Social *</Label>
              <Input
                id="razon_social"
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                required
                maxLength={200}
                className="font-body"
              />
              {errors.razon_social && <p className="text-sm text-destructive font-body">{errors.razon_social}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc" className="font-heading">RFC *</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                required
                maxLength={13}
                placeholder="AAA123456A12"
                className="font-body"
              />
              {errors.rfc && <p className="text-sm text-destructive font-body">{errors.rfc}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="domicilio_fiscal" className="font-heading">Domicilio Fiscal *</Label>
              <Textarea
                id="domicilio_fiscal"
                value={formData.domicilio_fiscal}
                onChange={(e) => setFormData({ ...formData, domicilio_fiscal: e.target.value })}
                required
                maxLength={500}
                className="font-body"
              />
              {errors.domicilio_fiscal && <p className="text-sm text-destructive font-body">{errors.domicilio_fiscal}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono" className="font-heading">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                maxLength={20}
                placeholder="5512345678"
                className="font-body"
              />
              {errors.telefono && <p className="text-sm text-destructive font-body">{errors.telefono}</p>}
            </div>
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
