import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  user: {
    id: string;
    email: string;
    nombre_completo: string;
    role: string;
  } | null;
}

export default function EditUserDialog({ open, onOpenChange, onUserUpdated, user }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nombreCompleto: '',
    role: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        nombreCompleto: user.nombre_completo,
        role: user.role === 'sin rol' ? 'consultor' : user.role
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!formData.email || !formData.nombreCompleto || !formData.role) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          email: formData.email,
          nombreCompleto: formData.nombreCompleto,
          role: formData.role
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Usuario actualizado correctamente');
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Editar Usuario</DialogTitle>
          <DialogDescription className="font-body">
            Actualiza la información del usuario
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-heading">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombreCompleto" className="font-heading">
                Nombre Completo
              </Label>
              <Input
                id="nombreCompleto"
                type="text"
                value={formData.nombreCompleto}
                onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                placeholder="Juan Pérez"
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="font-heading">
                Rol
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador" className="font-body">Administrador</SelectItem>
                  <SelectItem value="consultor" className="font-body">Consultor</SelectItem>
                  <SelectItem value="cliente" className="font-body">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="font-heading"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gradient-primary shadow-elegant font-heading"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Usuario'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
