import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { EmpresaProgramaInsert } from '@/types/domain';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Percent, Shield, Globe, Package, FileCheck,
  ArrowRight, ArrowLeft, Check, MapPin, Phone, Briefcase
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaCreated: (empresaId?: string) => void;
}

const PROGRAMAS_OPCIONES = [
  {
    value: 'immex',
    label: 'IMMEX',
    short: 'Manufactura y Exportación',
    desc: 'Diferimiento de impuestos (IGI/IVA) para importaciones temporales de insumos y maquinaria.',
    icon: Globe,
    color: 'hover:border-blue-500 focus-within:border-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-500',
    selectedBg: 'border-blue-500 bg-blue-500/[0.04]',
  },
  {
    value: 'prosec',
    label: 'PROSEC',
    short: 'Aranceles Preferenciales',
    desc: 'Aranceles reducidos para importar insumos y maquinaria destinados a sectores productivos específicos.',
    icon: Percent,
    color: 'hover:border-emerald-500 focus-within:border-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-500',
    selectedBg: 'border-emerald-500 bg-emerald-500/[0.04]',
  },
  {
    value: 'padron_general',
    label: 'Padrón General',
    short: 'Registro de Importadores',
    desc: 'Inscripción obligatoria y básica para la internación legal de cualquier mercancía a México.',
    icon: FileCheck,
    color: 'hover:border-purple-500 focus-within:border-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-500',
    selectedBg: 'border-purple-500 bg-purple-500/[0.04]',
  },
  {
    value: 'padron_sectorial',
    label: 'Padrón Sectorial',
    short: 'Sectores Específicos',
    desc: 'Autorización adicional para importar mercancías reguladas o sensibles (textil, acero, química, etc.).',
    icon: Package,
    color: 'hover:border-amber-500 focus-within:border-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-500',
    selectedBg: 'border-amber-500 bg-amber-500/[0.04]',
  },
  {
    value: 'cert_iva_ieps',
    label: 'Certificación IVA/IEPS',
    short: 'Crédito Fiscal del 100%',
    desc: 'Crédito fiscal inmediato en el pago de IVA y IEPS para tus importaciones temporales.',
    icon: Shield,
    color: 'hover:border-rose-500 focus-within:border-rose-500',
    badgeBg: 'bg-rose-500/10 text-rose-500',
    selectedBg: 'border-rose-500 bg-rose-500/[0.04]',
  },
  {
    value: 'general',
    label: 'General',
    short: 'Obligaciones Comunes',
    desc: 'Obligaciones periódicas fiscales y operativas generales de comercio exterior para toda empresa.',
    icon: Building2,
    color: 'hover:border-slate-500 focus-within:border-slate-500',
    badgeBg: 'bg-slate-500/10 text-slate-500',
    selectedBg: 'border-slate-500 bg-slate-500/[0.04]',
  },
] as const;

export default function OnboardingEmpresaWizard({ open, onOpenChange, onEmpresaCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: '',
    rfc: '',
    domicilio_fiscal: '',
    telefono: '',
    actividad_economica: '',
  });
  const [programasSeleccionados, setProgramasSeleccionados] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePrograma = (value: string) => {
    setProgramasSeleccionados(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
  };

  const validateStep = (currentStep: number) => {
    const errs: Record<string, string> = {};
    if (currentStep === 1) {
      if (!formData.razon_social.trim()) {
        errs.razon_social = 'La Razón Social es requerida';
      }
      if (!formData.rfc.trim()) {
        errs.rfc = 'El RFC es requerido';
      } else if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(formData.rfc.trim().toUpperCase())) {
        errs.rfc = 'Formato de RFC inválido (Debe tener 12 o 13 caracteres alfanuméricos)';
      }
    } else if (currentStep === 2) {
      if (!formData.domicilio_fiscal.trim()) {
        errs.domicilio_fiscal = 'El Domicilio Fiscal es requerido';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('empresas').insert({
        razon_social: formData.razon_social.trim(),
        rfc: formData.rfc.trim().toUpperCase(),
        domicilio_fiscal: formData.domicilio_fiscal.trim(),
        telefono: formData.telefono.trim() || null,
        actividad_economica: formData.actividad_economica.trim() || null,
        created_by: user?.id,
      }).select('id').single();

      if (error) throw error;

      // Insertar programas seleccionados en empresa_programas
      // (el trigger en DB genera las obligaciones automáticamente)
      if (programasSeleccionados.length > 0) {
        const { error: progError } = await supabase
          .from('empresa_programas')
          .insert(
            programasSeleccionados.map((programa: string): EmpresaProgramaInsert => ({
              empresa_id: data.id,
              programa,
              activo: true,
              fecha_inicio: null,
            }))
          );
        if (progError) throw progError;
      }

      toast.success('Empresa y obligaciones creadas correctamente');
      
      // Resetear estado
      setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '' });
      setProgramasSeleccionados([]);
      setErrors({});
      setStep(1);
      
      onOpenChange(false);
      onEmpresaCreated(data.id);
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar la empresa');
    } finally {
      setLoading(false);
    }
  };

  const stepsInfo = [
    { title: 'Identidad', desc: 'Datos legales' },
    { title: 'Contacto', desc: 'Ubicación y giro' },
    { title: 'Programas', desc: 'Fomento regulatorio' }
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        // Al cerrar, resetear a step 1
        setStep(1);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-background">
        
        {/* Encabezado Editorial Moderno */}
        <div className="bg-primary px-8 py-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, white 0%, transparent 60%)' }} />
          <div className="relative">
            <span className="text-[10px] font-mono tracking-widest text-primary-foreground/60 uppercase">ONBOARDING DE EMPRESA</span>
            <h2 className="text-xl font-bold text-white font-heading mt-1">Configura tu Entorno de Cumplimiento</h2>
            <p className="text-xs text-primary-foreground/75 mt-1">Registra la empresa para activar automáticamente su calendario de obligaciones.</p>
          </div>
        </div>

        {/* Barra de Progreso del Stepper */}
        <div className="px-8 pt-6 pb-2 border-b border-border/40">
          <div className="flex items-center justify-between relative">
            {stepsInfo.map((s, idx) => {
              const stepNum = idx + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              return (
                <div key={idx} className="flex flex-col items-center z-10 flex-1 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110 shadow-md' 
                      : isCompleted 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className={`text-[10px] font-semibold mt-1.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 hidden sm:block">
                    {s.desc}
                  </span>
                </div>
              );
            })}
            {/* Línea conectora de fondo */}
            <div className="absolute top-4 left-[15%] right-[15%] h-[2px] bg-muted -z-0">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${((step - 1) / (stepsInfo.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Contenido Dinámico con AnimatePresence para suavidad */}
        <div className="px-8 py-6 min-h-[300px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-5"
            >
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" /> Razón Social *
                    </Label>
                    <Input 
                      placeholder="Ej. Comercializadora Industrial Mexicana S.A. de C.V." 
                      value={formData.razon_social} 
                      onChange={e => setFormData(p => ({ ...p, razon_social: e.target.value }))}
                      className="h-11 shadow-sm border-border/80 focus-visible:ring-primary/20"
                    />
                    {errors.razon_social && <p className="text-xs font-medium text-destructive">{errors.razon_social}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-primary" /> RFC de la Empresa *
                    </Label>
                    <Input 
                      placeholder="Ej. CIM120405XYZ" 
                      value={formData.rfc} 
                      onChange={e => setFormData(p => ({ ...p, rfc: e.target.value.toUpperCase() }))}
                      className="h-11 shadow-sm uppercase border-border/80 focus-visible:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground/60 leading-normal">
                      El Registro Federal de Contribuyentes para personas morales (12 caracteres) o físicas (13 caracteres).
                    </p>
                    {errors.rfc && <p className="text-xs font-medium text-destructive">{errors.rfc}</p>}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Domicilio Fiscal *
                    </Label>
                    <Input 
                      placeholder="Calle, número, colonia, municipio, estado, CP" 
                      value={formData.domicilio_fiscal} 
                      onChange={e => setFormData(p => ({ ...p, domicilio_fiscal: e.target.value }))}
                      className="h-11 shadow-sm border-border/80 focus-visible:ring-primary/20"
                    />
                    {errors.domicilio_fiscal && <p className="text-xs font-medium text-destructive">{errors.domicilio_fiscal}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-primary" /> Teléfono de Contacto
                      </Label>
                      <Input 
                        placeholder="Ej. 551 234 5678" 
                        value={formData.telefono} 
                        onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))}
                        className="h-11 shadow-sm border-border/80 focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-primary" /> Actividad Económica
                      </Label>
                      <Input 
                        placeholder="Ej. Manufactura de Autopartes" 
                        value={formData.actividad_economica} 
                        onChange={e => setFormData(p => ({ ...p, actividad_economica: e.target.value }))}
                        className="h-11 shadow-sm border-border/80 focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Selecciona los programas activos de la empresa. Basándonos en esta selección, se programarán automáticamente todas las obligaciones oficiales correspondientes.
                  </p>
                  
                  {/* Cuadrícula Visual Premium de Programas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                    {PROGRAMAS_OPCIONES.map((p) => {
                      const Icon = p.icon;
                      const isSelected = programasSeleccionados.includes(p.value);
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => togglePrograma(p.value)}
                          className={`flex items-start text-left p-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/10 ${p.color} ${
                            isSelected 
                              ? `${p.selectedBg} ring-1 ring-primary/45 border-transparent shadow-[0_4px_12px_rgba(0,0,0,0.03)] scale-[1.01]` 
                              : 'bg-card border-border/50 hover:bg-muted/40 hover:shadow-sm'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 mr-3 ${p.badgeBg} flex items-center justify-center`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-xs leading-none">{p.label}</span>
                              {isSelected && (
                                <div className="w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-white scale-90">
                                  <Check className="w-2.5 h-2.5 stroke-[3px]" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium block truncate leading-none mt-0.5">{p.short}</span>
                            <p className="text-[10px] text-muted-foreground/75 leading-tight mt-1 line-clamp-2">
                              {p.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Botones de Navegación del Onboarding */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/40">
            <div>
              {step > 1 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                  className="gap-1.5 h-10 px-4 rounded-lg font-medium border-border/80 hover:bg-muted"
                >
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                  setStep(1);
                  onOpenChange(false);
                }}
                className="h-10 px-4 rounded-lg font-medium text-muted-foreground hover:bg-muted/65"
              >
                Cancelar
              </Button>
              
              {step < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="gap-1.5 h-10 px-5 rounded-lg font-medium shadow-sm hover:shadow"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="gap-1.5 h-10 px-5 rounded-lg font-bold shadow-md hover:shadow bg-primary text-primary-foreground"
                >
                  {loading ? 'Creando...' : (
                    <>
                      Activar Calendario <Check className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
