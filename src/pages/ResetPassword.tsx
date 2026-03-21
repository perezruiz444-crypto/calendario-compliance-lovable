import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Mail, ArrowLeft, ArrowRight, CheckCircle2, Bell, Shield, BarChart3 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Email inválido').max(255),
});

const FEATURES = [
  { icon: Bell,      text: 'Alertas automáticas de vencimientos' },
  { icon: Shield,    text: 'Control de obligaciones IMMEX, PROSEC, IVA/IEPS' },
  { icon: BarChart3, text: 'Reportes de cumplimiento exportables' },
];

export default function ResetPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate                = useNavigate();

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
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0].message);
      } else if (err instanceof Error) {
        const seconds = err.message.match(/\d+/)?.[0] || '60';
        toast.error(err.message.includes('request this after')
          ? `Por seguridad, espera ${seconds} segundos antes de reintentar`
          : err.message);
      } else {
        toast.error('Ocurrió un error al enviar el correo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] relative overflow-hidden p-12"
        style={{ background: 'hsl(var(--primary))' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(30%, 30%)' }} />
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full opacity-5"
          style={{ background: 'white', transform: 'translate(-30%, -30%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-bold text-lg font-heading">Calendario Compliance</p>
        </div>

        {/* Hero */}
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

        <p className="relative text-white/30 text-xs">© {new Date().getFullYear()} Calendario Compliance</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">Calendario Compliance</span>
          </div>

          {emailSent ? (
            /* ── Confirmación ── */
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground font-heading mb-1">Correo enviado</h2>
                <p className="text-sm text-muted-foreground">
                  Enviamos las instrucciones a<br />
                  <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
              </p>
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            /* ── Formulario ── */
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground font-heading mb-1">Recuperar contraseña</h2>
                <p className="text-sm text-muted-foreground">
                  Ingresa tu correo y te enviaremos las instrucciones
                </p>
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 h-11 text-sm font-semibold"
                  style={{ background: 'hsl(var(--primary))' }}
                >
                  {loading ? 'Enviando...' : (
                    <>Enviar instrucciones <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/auth')}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Volver al inicio de sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
