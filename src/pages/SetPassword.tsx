import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ArrowRight, CheckCircle2, Bell, Shield, BarChart3 } from 'lucide-react';
import { z } from 'zod';
import { Logo } from '@/components/brand/Logo';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(100, 'Contraseña muy larga')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

const FEATURES = [
  { icon: Bell,      text: 'Alertas automáticas de vencimientos' },
  { icon: Shield,    text: 'Control de obligaciones IMMEX, PROSEC, IVA/IEPS' },
  { icon: BarChart3, text: 'Reportes de cumplimiento exportables' },
];

export default function SetPassword() {
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]               = useState(false);
  const [done, setDone]                     = useState(false);
  const navigate                            = useNavigate();

  const isInvite = window.location.hash.includes('type=invite');

  useEffect(() => {
    const checkSession = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type        = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      if (accessToken && (type === 'recovery' || type === 'invite')) {
        const { error } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        if (error) {
          toast.error('El enlace es inválido o ha expirado.');
          setTimeout(() => navigate('/auth'), 2000);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sesión inválida o expirada. Solicita un nuevo enlace.');
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
      const { error } = await supabase.auth.updateUser({ password: validated.password });
      if (error) throw error;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate('/auth'), 2500);
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.issues[0].message);
      else if (err instanceof Error) toast.error(err.message);
      else toast.error('Ocurrió un error al establecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
        style={{ background: '#111418' }}>

        <div className="relative border-t-[3px] border-white pt-5 text-white">
          <Logo tagline="Folio de cumplimiento · MX" />
        </div>

        <div className="relative space-y-6">
          <div>
            <h1 className="display-1 text-white">
              Todo en su folio.<br />
              <span className="text-white/70">Todo a tiempo.</span>
            </h1>
            <p className="text-white/80 text-sm mt-4 leading-relaxed max-w-xs">
              Gestiona todas las obligaciones regulatorias de tus empresas desde un solo lugar.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 border border-white/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white/70" />
                </div>
                <span className="text-sm text-white/85">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[11px] uppercase tracking-[0.06em] text-white/50">© {new Date().getFullYear()} Calendario Compliance</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-foreground">
            <Logo />
          </div>

          {done ? (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-none bg-success/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h2 className="text-3xl font-bold uppercase text-foreground font-heading mb-1">¡Contraseña establecida!</h2>
                <p className="text-sm text-muted-foreground">Redirigiendo al inicio de sesión…</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold uppercase text-foreground font-heading mb-1">
                  {isInvite ? '¡Bienvenido!' : 'Nueva contraseña'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isInvite
                    ? 'Establece tu contraseña para acceder al sistema'
                    : 'Crea una contraseña segura para tu cuenta'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Nueva contraseña
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
                  <p className="text-xs text-muted-foreground pl-1">
                    Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Confirmar contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
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
                  {loading ? 'Procesando...' : (
                    <>{isInvite ? 'Crear cuenta' : 'Establecer contraseña'} <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
