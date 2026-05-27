import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Clock, CheckSquare, FileText, 
  ChevronRight, ChevronLeft, Shield, Upload, 
  ArrowUpRight, Building2, Bell, Check
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientOnboardingTour({ isOpen, onClose }: Props) {
  const [step, setStep] = useState(1);

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const slides = [
    {
      title: '¡Te damos la bienvenida a tu Portal!',
      subtitle: 'Tu consultor ya preparó todo',
      desc: '¡Tu entorno de cumplimiento regulatorio ya está listo! Tu consultor de Comercio Exterior ha configurado los programas de fomento de tu empresa (IMMEX, PROSEC, etc.) y ha programado todas tus fechas de vencimiento oficiales. No necesitas configurar nada más.',
      illustration: (
        <div className="relative w-full h-44 bg-gradient-to-br from-primary/10 to-indigo-500/5 rounded-2xl flex items-center justify-center border border-primary/20 overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center relative z-10"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-3">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-background border border-border/80 rounded-full shadow-sm text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" /> Entorno Configurado
            </div>
          </motion.div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
        </div>
      ),
      bulletPoints: [
        { title: 'Cero configuración:', text: 'Tus programas y plazos ya están cargados.' },
        { title: 'Seguridad absoluta:', text: 'Toda tu información está protegida con RLS de nivel empresarial.' },
      ]
    },
    {
      title: 'El Semáforo de Cumplimiento',
      subtitle: 'Mantén tus programas de fomento a salvo',
      desc: 'Olvídate de revisar hojas de cálculo complejas. Tu nuevo semáforo inteligente te avisa del estado de tus obligaciones en tiempo real. Previene cancelaciones de programas IMMEX o suspensiones del Padrón antes de que ocurran.',
      illustration: (
        <div className="relative w-full h-44 bg-gradient-to-br from-background to-muted rounded-2xl flex items-center justify-center border border-border/40 overflow-hidden">
          <div className="flex items-center gap-6 relative z-10">
            {/* Rojo */}
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Vencida</span>
            </motion.div>
            {/* Amarillo */}
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.4 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 text-warning flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Por Vencer</span>
            </motion.div>
            {/* Verde */}
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.8 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 text-success flex items-center justify-center shadow-sm ring-4 ring-success/10">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Al Día</span>
            </motion.div>
          </div>
        </div>
      ),
      bulletPoints: [
        { title: 'Alertas tempranas:', text: 'Recordatorios antes de los plazos de vencimiento.' },
        { title: 'Acción prioritaria:', text: 'Enfoca tus esfuerzos en lo que requiere atención inmediata.' },
      ]
    },
    {
      title: 'Márcalo como Listo y Ya',
      subtitle: 'Sin papeleos ni cargas lentas',
      desc: '¿Ya realizaste el trámite o la presentación obligatoria? No necesitas subir PDFs, acuses, ni archivos de evidencia pesados. Solo abre la tarea en tu lista o calendario y haz clic en el check para marcarla como "Completada". ¡Así de simple!',
      illustration: (
        <div className="relative w-full h-44 bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-2xl flex items-center justify-center border border-border/40 overflow-hidden">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 text-success flex items-center justify-center shadow-md">
              <Check className="w-8 h-8 stroke-[3px]" />
            </div>
            <div className="flex items-center gap-1.5 bg-success/10 border border-success/20 text-success text-[10px] font-bold px-3 py-1 rounded-full">
              ¿Cumpliste? ➡️ ¡Listo!
            </div>
          </motion.div>
        </div>
      ),
      bulletPoints: [
        { title: 'Cero complicaciones:', text: 'No requieres arrastrar archivos ni acuses de recibo.' },
        { title: 'Actualización al instante:', text: 'Al marcar la tarea, tu calendario se actualiza a verde de inmediato.' },
      ]
    },
    {
      title: 'Reportes y Auditorías Listos',
      subtitle: 'Tu historial seguro y exportable',
      desc: '¿Tienes una auditoría interna o una inspección de la autoridad? En la sección de "Reportes" puedes descargar al instante reportes consolidados en formato PDF o Excel con todo tu historial de acuses y cumplimiento aduanero.',
      illustration: (
        <div className="relative w-full h-44 bg-gradient-to-br from-background to-muted rounded-2xl flex items-center justify-center border border-border/40 overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="px-4 py-3 rounded-xl bg-card border border-border shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">REPORTE CUMPLIMIENTO</p>
                <span className="text-xs font-bold text-foreground">Historial_Anual.xlsx</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      ),
      bulletPoints: [
        { title: 'Respaldos a la mano:', text: 'Acceso ilimitado al histórico de acuses presentados.' },
        { title: 'Cumplimiento oficial:', text: 'Prueba sólida de cumplimiento para auditorías de IMMEX/PROSEC.' },
      ]
    }
  ];

  const currentSlide = slides[step - 1];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-background">
        
        {/* Visual Header / Illustration */}
        <div className="p-6 pb-2">
          {currentSlide.illustration}
        </div>

        {/* Slide Content */}
        <div className="px-8 pb-4 pt-2 space-y-4">
          <div className="text-center sm:text-left">
            <span className="text-[9px] font-mono tracking-widest text-primary font-bold uppercase">
              {currentSlide.subtitle}
            </span>
            <h2 className="text-lg font-extrabold text-foreground font-heading mt-1 leading-tight">
              {currentSlide.title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              {currentSlide.desc}
            </p>
          </div>

          {/* Bullet Points */}
          <div className="space-y-2.5 pt-1.5">
            {currentSlide.bulletPoints.map((bp, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-muted/30 p-2.5 rounded-lg border border-border/30">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <CheckSquare className="w-3 h-3 stroke-[2.5px]" />
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  <strong className="font-semibold text-primary">{bp.title}</strong> {bp.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-8 py-5 bg-muted/40 border-t border-border/40 flex items-center justify-between">
          {/* Indicador de progreso */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i + 1 
                    ? 'w-6 bg-primary' 
                    : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            {step > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="gap-1 h-9 rounded-lg font-medium text-muted-foreground hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={handleNext}
              className="gap-1 h-9 rounded-lg font-bold shadow bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {step === totalSteps ? (
                <>
                  Entendido, ¡Comenzar! <Sparkles className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Siguiente <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
