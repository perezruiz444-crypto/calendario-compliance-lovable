import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2 } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'Contraseña muy larga')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a recovery/invite session or hash params
    const checkSession = async () => {
      // First check hash params (for email links)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      console.log('SetPassword - Hash type:', type);
      console.log('SetPassword - Has access token:', !!accessToken);
      
      // If we have an access token from the email link, set the session
      if (accessToken && (type === 'recovery' || type === 'invite')) {
        console.log('Valid recovery/invite link detected, setting session');
        try {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            toast.error('El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.');
            setTimeout(() => navigate('/auth'), 2000);
          }
        } catch (error) {
          console.error('Error processing link:', error);
          toast.error('Error al procesar el enlace.');
          setTimeout(() => navigate('/auth'), 2000);
        }
        return;
      }
      
      // If no hash params, check if we have a valid session already
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No valid session found, redirecting to auth');
        toast.error('Sesión inválida o expirada. Por favor, solicita un nuevo enlace de invitación.');
        setTimeout(() => navigate('/auth'), 2000);
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = passwordSchema.parse({ password, confirmPassword });
      
      const { error } = await supabase.auth.updateUser({
        password: validated.password
      });

      if (error) throw error;

      toast.success('Contraseña establecida correctamente. Redirigiendo a inicio de sesión...');
      
      // Sign out to force fresh login with new password
      await supabase.auth.signOut();
      
      // Clear the hash from URL
      window.location.hash = '';
      
      // Redirect after a brief delay
      setTimeout(() => {
        navigate('/auth');
      }, 1500);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Ocurrió un error al establecer la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-elegant">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading">
              Establecer Contraseña
            </CardTitle>
            <CardDescription className="font-body">
              {window.location.hash.includes('type=invite') 
                ? 'Bienvenido! Establece tu contraseña para acceder al sistema'
                : 'Crea una contraseña segura para tu cuenta'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading">Nueva Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={100}
                className="font-body"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-heading">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={100}
                className="font-body"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Establecer Contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
