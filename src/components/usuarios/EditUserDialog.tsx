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
  const [empresas, setEmpresas] = useState<Array<{ id: string; razon_social: string }>>([]);
  const [formData, setFormData] = useState({
    email: '',
    nombreCompleto: '',
    role: '',
    empresaId: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      fetchUserEmpresa();
    }
  }, [open]);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        nombreCompleto: user.nombre_completo,
        role: user.role === 'sin rol' ? 'consultor' : user.role,
        empresaId: ''
      });
      fetchUserEmpresa();
    }
  }, [user]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Error al cargar empresas:', error);
    }
  };

  const fetchUserEmpresa = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data?.empresa_id) {
        setFormData(prev => ({ ...prev, empresaId: data.empresa_id || '' }));
      }
    } catch (error: any) {
      console.error('Error al cargar empresa del usuario:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!formData.email || !formData.nombreCompleto || !formData.role) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validate that cliente role requires empresa_id
    if (formData.role === 'cliente' && !formData.empresaId) {
      toast.error('Debes seleccionar una empresa para el cliente');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          email: formData.email,
          nombreCompleto: formData.nombreCompleto,
          role: formData.role,
          empresaId: formData.role === 'cliente' ? formData.empresaId : null
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

            {formData.role === 'cliente' && (
              <div className="space-y-2">
                <Label htmlFor="empresaId" className="font-heading">
                  Empresa *
                </Label>
                <Select 
                  value={formData.empresaId} 
                  onValueChange={(value) => setFormData({ ...formData, empresaId: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Selecciona una empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id} className="font-body">
                        {empresa.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-body">
                  El cliente solo podrá ver información de esta empresa
                </p>
              </div>
            )}
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
