import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [empresas, setEmpresas] = useState<Array<{ id: string; razon_social: string }>>([]);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    nombre_completo: '',
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
    } catch (error: any) {
      toast.error('Error al cargar empresas');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate form data (excluding password for invitations)
    try {
      const invitationSchema = z.object({
        email: z.string().email('Email inválido'),
        nombre_completo: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
        role: z.enum(['administrador', 'consultor', 'cliente']),
        empresa_id: z.string().optional()
      });
      
      const validationData = {
        email: formData.email,
        nombre_completo: formData.nombre_completo,
        role: formData.role,
        empresa_id: formData.empresa_id || undefined
      };

      // Validate that cliente role requires empresa_id
      if (formData.role === 'cliente' && !formData.empresa_id) {
        setErrors({ empresa_id: 'Debes seleccionar una empresa para el cliente' });
        toast.error('Debes seleccionar una empresa para el cliente');
        return;
      }

      invitationSchema.parse(validationData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
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
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: formData.email,
          role: formData.role,
          nombreCompleto: formData.nombre_completo,
          empresaId: formData.empresa_id || null
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al enviar invitación');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store setup link if provided
      if (data?.setupLink) {
        setSetupLink(data.setupLink);
        setCreatedEmail(data.email);
        
        if (data?.emailSent) {
          toast.success('Usuario creado y correo enviado. También puedes usar el enlace de respaldo.');
        } else {
          toast.success('Usuario creado. El correo no se pudo enviar, usa el enlace de configuración.');
        }
      } else {
        toast.success(data?.message || 'Usuario creado correctamente');
        onOpenChange(false);
      }
      
      setFormData({ email: '', nombre_completo: '', role: 'consultor', empresa_id: '' });
      onUserCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (setupLink) {
      navigator.clipboard.writeText(setupLink);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  const handleCloseWithLink = () => {
    setSetupLink(null);
    setCreatedEmail('');
    onOpenChange(false);
  };

  // Show setup link dialog if we have one
  if (setupLink) {
    return (
      <Dialog open={open} onOpenChange={handleCloseWithLink}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">✅ Usuario Creado Exitosamente</DialogTitle>
            <DialogDescription className="font-body">
              Enlace de configuración para {createdEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg border-2 border-primary/20">
              <p className="text-xs font-semibold text-muted-foreground mb-2 font-heading">ENLACE DE CONFIGURACIÓN:</p>
              <code className="text-sm font-mono break-all block">{setupLink}</code>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopyLink} className="flex-1 gradient-primary shadow-elegant font-heading">
                📋 Copiar Enlace
              </Button>
              <Button onClick={handleCloseWithLink} variant="outline" className="font-heading">
                Cerrar
              </Button>
            </div>
            <div className="bg-primary-light dark:bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm font-body text-foreground">
                <strong>Instrucciones:</strong><br/>
                1. Copia este enlace<br/>
                2. Envíalo al usuario por WhatsApp, correo o mensaje<br/>
                3. El usuario podrá establecer su contraseña (válido 7 días)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Invitar Nuevo Usuario</DialogTitle>
          <DialogDescription className="font-body">
            Se enviará un email de invitación con un enlace para que el usuario establezca su contraseña
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
              <p className="text-xs text-muted-foreground font-body">
                El usuario recibirá un email para establecer su contraseña
              </p>
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
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
