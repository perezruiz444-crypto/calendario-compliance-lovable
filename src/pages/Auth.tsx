import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Building2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muy largo'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100, 'Contraseña muy larga'),
});

const signupSchema = loginSchema.extend({
  nombreCompleto: z.string().trim().min(1, 'El nombre es requerido').max(100, 'Nombre muy largo'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const validated = loginSchema.parse({ email, password });
        const { error } = await signIn(validated.email, validated.password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Credenciales incorrectas');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Bienvenido');
        }
      } else {
        const validated = signupSchema.parse({ email, password, confirmPassword, nombreCompleto });
        const { error } = await signUp(validated.email, validated.password, validated.nombreCompleto);
        
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email ya está registrado');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Cuenta creada exitosamente. Por favor verifica tu email.');
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Ocurrió un error inesperado');
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
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription className="font-body">
              {isLogin 
                ? 'Ingresa tus credenciales para acceder al sistema' 
                : 'Completa el formulario para crear tu cuenta'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto" className="font-heading">Nombre Completo</Label>
                <Input
                  id="nombreCompleto"
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  maxLength={100}
                  className="font-body"
                />
              </div>
            )}
            
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
            
            <div className="space-y-2">
              <Label htmlFor="password" className="font-heading">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                maxLength={100}
                className="font-body"
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-heading">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  maxLength={100}
                  className="font-body"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
              disabled={loading}
            >
              {loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-smooth font-body"
              >
                {isLogin 
                  ? '¿No tienes cuenta? Regístrate' 
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
