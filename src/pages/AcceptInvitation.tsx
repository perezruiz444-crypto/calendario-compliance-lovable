import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Mail, Lock, User } from 'lucide-react';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      toast({
        title: "Token inválido",
        description: "El enlace de invitación no es válido",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error('Invitación no encontrada o ya utilizada');
      }

      // Check if expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        throw new Error('Esta invitación ha expirado');
      }

      setInvitation(data);
    } catch (error: any) {
      console.error('Error fetching invitation:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setTimeout(() => navigate('/auth'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Por favor verifica que ambas contraseñas sean iguales",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            nombre_completo: invitation.nombre_completo
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Error al crear el usuario');
      }

      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update invitation status
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      setAccepted(true);
      
      toast({
        title: "¡Cuenta creada exitosamente!",
        description: "Tu cuenta ha sido creada. Redirigiendo..."
      });

      // Sign in the user
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password: password
        });

        if (signInError) {
          console.error('Error signing in:', signInError);
          navigate('/auth');
        } else {
          navigate('/');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md gradient-card shadow-card">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-success/10 rounded-full">
                <CheckCircle className="w-12 h-12 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl font-heading">¡Bienvenido!</CardTitle>
            <CardDescription className="font-body">
              Tu cuenta ha sido creada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground font-body mb-4">
              Redirigiendo al sistema...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl font-heading flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Completa tu Registro
          </CardTitle>
          <CardDescription className="font-body">
            Has sido invitado a unirte al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="font-heading font-semibold">{invitation.nombre_completo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="font-body">{invitation.email}</span>
            </div>
            <div className="mt-2 text-sm">
              <span className="font-body text-muted-foreground">Rol: </span>
              <span className="font-heading font-medium">
                {invitation.role === 'consultor' ? 'Consultor' : 
                 invitation.role === 'cliente' ? 'Cliente' : 
                 invitation.role === 'administrador' ? 'Administrador' : invitation.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="pl-9 font-body"
                  required
                  minLength={6}
                />
              </div>
              <p className="text-xs text-muted-foreground font-body">
                Mínimo 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-heading">
                Confirmar Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className="pl-9 font-body"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-heading"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Registro
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground font-body">
              ¿Ya tienes una cuenta?{' '}
              <a href="/auth" className="text-primary hover:underline font-medium">
                Iniciar sesión
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
