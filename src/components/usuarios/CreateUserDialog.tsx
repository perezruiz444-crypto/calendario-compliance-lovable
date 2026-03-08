import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
}

export default function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Array<{ id: string; razon_social: string }>>([]);
  const [usePassword, setUsePassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nombre_completo: '',
    password: '',
    role: 'consultor' as 'administrador' | 'consultor' | 'cliente',
    empresa_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      fetchEmpresas();
    }
  }, [open]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');
      if (error) throw error;
      setEmpresas(data || []);
    } catch {
      toast.error('Error al cargar empresas');
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre es requerido';
    }
    if (formData.role === 'cliente' && !formData.empresa_id) {
      newErrors.empresa_id = 'Debes seleccionar una empresa para el cliente';
    }
    if (usePassword && formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    try {
      if (usePassword) {
        // Direct creation with password
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            nombre_completo: formData.nombre_completo,
            role: formData.role,
            empresa_id: formData.empresa_id || null
          },
        });
        if (error) throw new Error(error.message || 'Error al crear usuario');
        if (data?.error) throw new Error(data.error);

        toast.success(`Usuario ${formData.email} creado con contraseña exitosamente`);
        resetAndClose();
        onUserCreated();
      } else {
        // Invitation flow
        const { data, error } = await supabase.functions.invoke('send-user-invitation', {
          body: {
            email: formData.email,
            role: formData.role,
            nombreCompleto: formData.nombre_completo,
            empresaId: formData.empresa_id || null
          },
        });
        if (error) throw new Error(error.message || 'Error al enviar invitación');
        if (data?.error) throw new Error(data.error);

        if (data?.setupLink) {
          // Show persistent toast with copy button instead of second dialog
          toast.success(`Usuario ${data.email} creado`, {
            description: data.emailSent
              ? 'Correo enviado. También puedes copiar el enlace de configuración.'
              : 'El correo no se pudo enviar. Copia el enlace de configuración.',
            duration: 30000,
            action: {
              label: '📋 Copiar enlace',
              onClick: () => {
                navigator.clipboard.writeText(data.setupLink);
                toast.success('Enlace copiado al portapapeles');
              }
            }
          });
        } else {
          toast.success(data?.message || 'Usuario creado correctamente');
        }

        resetAndClose();
        onUserCreated();
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData({ email: '', nombre_completo: '', password: '', role: 'consultor', empresa_id: '' });
    setErrors({});
    setUsePassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Crear Nuevo Usuario</DialogTitle>
          <DialogDescription className="font-body">
            {usePassword
              ? 'El usuario podrá iniciar sesión inmediatamente con la contraseña asignada'
              : 'Se enviará un email de invitación con un enlace para establecer contraseña'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Mode toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-heading text-sm">Crear con contraseña</Label>
                <p className="text-xs text-muted-foreground font-body">
                  {usePassword ? 'Asignarás la contraseña directamente' : 'Se enviará invitación por email'}
                </p>
              </div>
              <Switch checked={usePassword} onCheckedChange={setUsePassword} />
            </div>

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

            {usePassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="font-heading">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="font-body"
                />
                {errors.password && <p className="text-sm text-destructive font-body">{errors.password}</p>}
              </div>
            )}

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

            {formData.role === 'cliente' && (
              <div className="space-y-2">
                <Label htmlFor="empresa_id" className="font-heading">Empresa *</Label>
                <Select value={formData.empresa_id} onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}>
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
                {errors.empresa_id && <p className="text-sm text-destructive font-body">{errors.empresa_id}</p>}
                <p className="text-xs text-muted-foreground font-body">
                  El cliente solo podrá ver información de esta empresa
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
              {loading ? 'Creando...' : usePassword ? 'Crear Usuario' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
