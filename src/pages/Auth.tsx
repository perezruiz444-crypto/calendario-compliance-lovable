import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Lock, Mail, ArrowRight, Shield, Bell, BarChart3, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const HCAPTCHA_SITE_KEY = 'fa84f1de-88ac-4e62-af62-66ea2b848972';

const loginSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});

const FEATURES = [
  { icon: Bell,      text: 'Alertas automáticas de vencimientos' },
  { icon: Shield,    text: 'Control de obligaciones IMMEX, PROSEC, IVA/IEPS' },
  { icon: BarChart3, text: 'Reportes de cumplimiento exportables' },
];

// hCaptcha widget ID stored globally so we can reset it between attempts
declare global {
  interface Window {
    hcaptcha: {
      render: (container: string | HTMLElement, params: object) => string;
      execute: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
      reset: (widgetId: string) => void;
    };
    onHcaptchaLoad: () => void;
  }
}

export default function Auth() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [blocked, setBlocked]         = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaContainerRef           = useRef<HTMLDivElement>(null);
  const widgetIdRef                   = useRef<string | null>(null);
  const { signIn, user }              = useAuth();
  const navigate                      = useNavigate();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  // Load hCaptcha script once
  useEffect(() => {
    if (document.getElementById('hcaptcha-script')) {
      setCaptchaReady(true);
      return;
    }

    window.onHcaptchaLoad = () => setCaptchaReady(true);

    const script = document.createElement('script');
    script.id = 'hcaptcha-script';
    script.src = 'https://js.hcaptcha.com/1/api.js?onload=onHcaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Don't remove the script on unmount — it may still be needed
    };
  }, []);

  // Render the hCaptcha widget once the script is ready
  useEffect(() => {
    if (!captchaReady || !captchaContainerRef.current || widgetIdRef.current !== null) return;
    if (!window.hcaptcha) return; // guard: script may not have loaded

    try {
      widgetIdRef.current = window.hcaptcha.render(captchaContainerRef.current, {
        sitekey: HCAPTCHA_SITE_KEY,
        size: 'invisible',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null),
        'error-callback': () => setCaptchaToken(null),
      });
    } catch (e) {
      console.warn('[hCaptcha] widget render failed:', e);
    }
  }, [captchaReady]);

  const resetCaptcha = useCallback(() => {
    if (widgetIdRef.current !== null && window.hcaptcha) {
      window.hcaptcha.reset(widgetIdRef.current);
      setCaptchaToken(null);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;

    setLoading(true);
    try {
      const validated = loginSchema.parse({ email, password });

      // Check rate limiting before attempting sign-in
      const { data: isBlocked } = await supabase.rpc('is_login_blocked', {
        p_email: validated.email,
        p_ip: null,
      });

      if (isBlocked) {
        setBlocked(true);
        toast.error('Demasiados intentos fallidos. Espera 15 minutos antes de intentar de nuevo.');
        setLoading(false);
        return;
      }

      // Execute hCaptcha challenge (invisible — fires silently for real users)
      let token = captchaToken;
      if (!token && widgetIdRef.current !== null && window.hcaptcha) {
        window.hcaptcha.execute(widgetIdRef.current);
        // Wait up to 5s for the token callback
        token = await new Promise<string | null>((resolve) => {
          let waited = 0;
          const check = setInterval(() => {
            const t = widgetIdRef.current !== null && window.hcaptcha
              ? window.hcaptcha.getResponse(widgetIdRef.current)
              : '';
            waited += 200;
            if (t) { clearInterval(check); resolve(t); }
            else if (waited >= 5000) { clearInterval(check); resolve(null); }
          }, 200);
        });
      }

      const { error } = await signIn(validated.email, validated.password, token ?? undefined);

      if (error) {
        resetCaptcha();
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales incorrectas');
        } else if (error.message.toLowerCase().includes('captcha')) {
          toast.error('Verificación de seguridad fallida. Intenta de nuevo.');
        } else {
          toast.error(error.message);
        }
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

        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(30%, 30%)' }} />
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(-30%, -30%)' }} />

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

          {/* Rate-limit block message */}
          {blocked && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs text-destructive leading-relaxed">
                Cuenta bloqueada temporalmente por demasiados intentos fallidos.
                Intenta de nuevo en 15 minutos.
              </p>
            </div>
          )}

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
                  disabled={blocked}
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
                  disabled={blocked}
                />
              </div>
            </div>

            {/* Invisible hCaptcha widget */}
            <div ref={captchaContainerRef} />

            <Button
              type="submit"
              disabled={loading || blocked}
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
