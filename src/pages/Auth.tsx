import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Building2, Lock, Mail, ArrowRight, Shield, Bell, BarChart3 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});

const FEATURES = [
  { icon: Bell,     text: 'Alertas automáticas de vencimientos' },
  { icon: Shield,   text: 'Control de obligaciones IMMEX, PROSEC, IVA/IEPS' },
  { icon: BarChart3, text: 'Reportes de cumplimiento exportables' },
];

export default function Auth() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn, user }        = useAuth();
  const navigate                = useNavigate();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validated = loginSchema.parse({ email, password });
      const { error } = await signIn(validated.email, validated.password);
      if (error) {
        toast.error(error.message.includes('Invalid login credentials')
          ? 'Credenciales incorrectas' : error.message);
      } else {
        toast.success('Bienvenido');
      }
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.issues[0].message);
      else toast.error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
        style={{ background: 'hsl(var(--primary))' }}>

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(30%, 30%)' }} />
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(-30%, -30%)' }} />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight font-heading">Calendario Compliance</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight font-heading">
              Cumplimiento de<br />Comercio Exterior<br />
              <span className="text-white/60">sin complicaciones.</span>
            </h1>
            <p className="text-white/60 text-sm mt-4 leading-relaxed max-w-xs">
              Gestiona todas las obligaciones regulatorias de tus empresas desde un solo lugar.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white/70" />
                </div>
                <span className="text-sm text-white/70">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Calendario Compliance</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">Calendario Compliance</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground font-heading mb-1">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  required
                  maxLength={255}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={100}
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 h-11 text-sm font-semibold"
              style={{ background: 'hsl(var(--primary))' }}
            >
              {loading ? 'Verificando...' : (
                <>Ingresar <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/reset-password')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <p className="text-xs text-muted-foreground/60">
              ¿Sin acceso? Contacta a tu administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
