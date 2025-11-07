import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muy largo'),
});

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = emailSchema.parse({ email });
      
      const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
        redirectTo: `${window.location.origin}/set-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Correo de recuperación enviado');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else if (error instanceof Error) {
        if (error.message.includes('request this after')) {
          const seconds = error.message.match(/\d+/)?.[0] || '60';
          toast.error(`Por seguridad, espera ${seconds} segundos antes de reintentar`);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Ocurrió un error al enviar el correo');
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-elegant">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-heading">
                Correo Enviado
              </CardTitle>
              <CardDescription className="font-body">
                Revisa tu bandeja de entrada
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground font-body">
              Hemos enviado un correo a <strong>{email}</strong> con instrucciones para restablecer tu contraseña.
            </p>
            <p className="text-center text-sm text-muted-foreground font-body">
              Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
            </p>
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="w-full font-heading"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-elegant">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-heading">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="font-body">
              Ingresa tu correo para recibir instrucciones
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-heading">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                required
                maxLength={255}
                className="font-body"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar Correo de Recuperación'}
            </Button>

            <Button
              type="button"
              onClick={() => navigate('/auth')}
              variant="ghost"
              className="w-full font-heading"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
