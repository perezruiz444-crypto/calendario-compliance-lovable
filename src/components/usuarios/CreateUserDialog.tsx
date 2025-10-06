import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { userSchema } from '@/lib/validation';
import { z } from 'zod';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export default function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre_completo: '',
    role: 'consultor' as 'administrador' | 'consultor' | 'cliente'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form data
    try {
      userSchema.parse(formData);
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
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: formData,
      });

      if (error) {
        throw new Error(error.message || 'Error al crear usuario');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Usuario creado exitosamente');
      setFormData({ email: '', password: '', nombre_completo: '', role: 'consultor' });
      onOpenChange(false);
      onUserCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Crear Nuevo Usuario</DialogTitle>
          <DialogDescription className="font-body">
            Ingresa los datos del nuevo usuario y asigna su rol
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo" className="font-heading">Nombre Completo</Label>
              <Input
                id="nombre_completo"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                required
                maxLength={100}
                className="font-body"
              />
              {errors.nombre_completo && <p className="text-sm text-destructive font-body">{errors.nombre_completo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-heading">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                maxLength={255}
                className="font-body"
              />
              {errors.email && <p className="text-sm text-destructive font-body">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                maxLength={100}
                className="font-body"
              />
              {errors.password && <p className="text-sm text-destructive font-body">{errors.password}</p>}
              <p className="text-xs text-muted-foreground font-body">Mínimo 8 caracteres con mayúscula, minúscula y número</p>
            </div>
            <div className="space-y-2">
              <Label className="font-heading">Rol</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="administrador" id="administrador" />
                  <Label htmlFor="administrador" className="font-body cursor-pointer">Administrador</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consultor" id="consultor" />
                  <Label htmlFor="consultor" className="font-body cursor-pointer">Consultor</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cliente" id="cliente" />
                  <Label htmlFor="cliente" className="font-body cursor-pointer">Cliente</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
