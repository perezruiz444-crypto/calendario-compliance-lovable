import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageSquareHeart, Sparkles, Clock, CheckCircle2, ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'has_submitted_feedback_v1';
const SESSION_COUNT_KEY = 'session_count_v1';
const SNOOZE_KEY = 'feedback_snooze_until';
const MIN_SESSIONS = 3;

interface FeedbackModalProps {
  userId: string;
}

const STEPS = [
  { label: 'Razón', icon: '🎯' },
  { label: 'Semáforo', icon: '🚦' },
  { label: 'Fricción', icon: '🔍' },
  { label: 'Varita', icon: '✨' },
  { label: 'Retención', icon: '💬' },
];

export default function FeedbackModal({ userId }: FeedbackModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form state
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState([3]);
  const [q3, setQ3] = useState('');
  const [q4, setQ4] = useState('');
  const [q5, setQ5] = useState('');

  useEffect(() => {
    const checkIfShouldShow = () => {
      if (!userId) {
        setChecking(false);
        return;
      }

      // Ya respondió — nunca mostrar
      if (localStorage.getItem(STORAGE_KEY)) {
        setChecking(false);
        return;
      }

      // Incrementar contador de sesiones
      const currentCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10) || 0;
      const newCount = currentCount + 1;
      localStorage.setItem(SESSION_COUNT_KEY, String(newCount));

      // Aún no tiene suficientes sesiones
      if (newCount < MIN_SESSIONS) {
        setChecking(false);
        return;
      }

      // Verificar si está en modo snooze
      const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
      if (snoozeUntil && Date.now() < parseInt(snoozeUntil, 10)) {
        setChecking(false);
        return;
      }

      setChecking(false);
      setOpen(true);
    };

    checkIfShouldShow();
  }, [userId]);

  const canProceed = () => {
    switch (step) {
      case 0: return q1 !== '';
      case 1: return true; // slider always has a value
      case 2: return true; // optional
      case 3: return true; // optional
      case 4: return q5 !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!q1 || !q5) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('feedback_clientes').insert({
        user_id: userId,
        q1_razon_login: q1,
        q2_semaforo_rating: q2[0],
        q3_friccion: q3 || null,
        q4_varita_magica: q4 || null,
        q5_retencion: q5,
      });
      if (error) throw error;

      localStorage.setItem(STORAGE_KEY, 'true');
      toast.success('¡Gracias por tu retroalimentación! 🎉', {
        description: 'Tu opinión nos ayuda a construir una mejor plataforma.',
      });
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al enviar la encuesta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (checking || !open) return null;

  const ratingLabels = ['Muy difícil', 'Difícil', 'Neutral', 'Fácil', 'Muy fácil'];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[520px] p-0 overflow-hidden border-0 gap-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-[hsl(210,100%,20%)] to-[hsl(210,100%,30%)] px-6 pt-7 pb-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/15 p-2.5 rounded-xl">
              <MessageSquareHeart className="w-6 h-6" />
            </div>
            <div>
              <DialogHeader className="space-y-0 text-left">
                <DialogTitle className="font-heading text-xl font-bold text-white">
                  Ayúdanos a mejorar tu experiencia
                </DialogTitle>
              </DialogHeader>
            </div>
          </div>
          <DialogDescription className="text-white/80 font-body text-sm flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Solo te tomará 1-2 minutos · Tu opinión es 100% confidencial
          </DialogDescription>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-1.5 w-full rounded-full transition-all duration-300',
                    i <= step ? 'bg-white' : 'bg-white/25'
                  )}
                />
                <span className={cn(
                  'text-[10px] font-body transition-opacity',
                  i === step ? 'opacity-100' : 'opacity-50'
                )}>
                  {s.icon} {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Question content */}
        <div className="px-6 py-5 min-h-[220px] flex flex-col">
          {/* Q1 */}
          {step === 0 && (
            <div className="space-y-4 flex-1">
              <p className="font-heading font-semibold text-foreground">
                🎯 ¿Cuál es la razón principal por la que inicias sesión hoy?
              </p>
              <RadioGroup value={q1} onValueChange={setQ1} className="space-y-2.5">
                {[
                  'Revisar vencimientos',
                  'Subir evidencias',
                  'Ver tareas de mi equipo',
                  'Descargar reporte',
                  'Otra',
                ].map((opt) => (
                  <Label
                    key={opt}
                    className={cn(
                      'flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/50',
                      q1 === opt ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                    )}
                  >
                    <RadioGroupItem value={opt} />
                    <span className="font-body text-sm">{opt}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Q2 */}
          {step === 1 && (
            <div className="space-y-6 flex-1">
              <p className="font-heading font-semibold text-foreground">
                🚦 ¿Qué tan fácil te resulta identificar qué tareas "urgen" con solo ver los colores del Semáforo y el Calendario?
              </p>
              <div className="space-y-4 px-2">
                <Slider
                  value={q2}
                  onValueChange={setQ2}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-body">
                  <span>1 — Muy difícil</span>
                  <span>5 — Muy fácil</span>
                </div>
                <div className="text-center">
                  <span className="inline-flex items-center gap-2 bg-primary/10 text-primary font-heading font-bold text-lg px-4 py-2 rounded-lg">
                    {q2[0]} — {ratingLabels[q2[0] - 1]}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Q3 */}
          {step === 2 && (
            <div className="space-y-4 flex-1">
              <p className="font-heading font-semibold text-foreground">
                🔍 Sé brutalmente honesto: ¿Hay alguna sección o paso que te parezca confuso, inútil o que simplemente ignoras?
              </p>
              <Textarea
                value={q3}
                onChange={(e) => setQ3(e.target.value)}
                placeholder="Cuéntanos sin filtros... esto nos ayuda muchísimo"
                className="min-h-[120px] font-body resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground font-body">Opcional · {q3.length}/1000</p>
            </div>
          )}

          {/* Q4 */}
          {step === 3 && (
            <div className="space-y-4 flex-1">
              <p className="font-heading font-semibold text-foreground">
                ✨ El Test de la Varita Mágica: Si pudieras agregar una sola función que te ahorrara 2 horas de trabajo a la semana, ¿cuál sería?
              </p>
              <Textarea
                value={q4}
                onChange={(e) => setQ4(e.target.value)}
                placeholder="Piensa en grande... ¿qué te haría la vida más fácil?"
                className="min-h-[120px] font-body resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground font-body">Opcional · {q4.length}/1000</p>
            </div>
          )}

          {/* Q5 */}
          {step === 4 && (
            <div className="space-y-4 flex-1">
              <p className="font-heading font-semibold text-foreground">
                💬 Si Calendario Compliance dejara de existir mañana, ¿qué tan decepcionado estarías?
              </p>
              <RadioGroup value={q5} onValueChange={setQ5} className="space-y-2.5">
                {[
                  { value: 'Muy decepcionado', emoji: '😢', desc: 'Sería un problema serio para mi trabajo' },
                  { value: 'Algo decepcionado', emoji: '😕', desc: 'Me molestaría pero encontraría alternativas' },
                  { value: 'Nada decepcionado', emoji: '😐', desc: 'Realmente no me afectaría' },
                ].map((opt) => (
                  <Label
                    key={opt.value}
                    className={cn(
                      'flex items-center gap-3 border rounded-lg p-3.5 cursor-pointer transition-all hover:border-primary/50',
                      q5 === opt.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                    )}
                  >
                    <RadioGroupItem value={opt.value} />
                    <div>
                      <span className="font-body text-sm font-medium">{opt.emoji} {opt.value}</span>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{opt.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              className="gap-1.5 font-heading"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="gap-1.5 font-heading"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="gap-1.5 font-heading bg-gradient-to-r from-primary to-[hsl(210,100%,30%)]"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Enviar Mis Respuestas
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
