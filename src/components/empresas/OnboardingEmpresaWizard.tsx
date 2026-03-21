import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, ChevronRight, ChevronLeft, Building2, FileCheck, Zap } from 'lucide-react';
import { addMonths, addYears, format } from 'date-fns';

interface ObligacionTemplate {
  nombre: string;
  descripcion: string;
  articulos: string;
  categoria: string;
  presentacion: string;
}

const OBLIGACIONES_POR_PROGRAMA: Record<string, ObligacionTemplate[]> = {
  immex: [
    { nombre: 'Reporte Mensual de Producción IMMEX', descripcion: 'Presentar ante la SE el reporte mensual de operaciones de manufactura bajo el programa IMMEX, incluyendo insumos importados temporalmente y productos exportados.', articulos: 'Art. 25 Decreto IMMEX', categoria: 'immex', presentacion: 'Mensual' },
    { nombre: 'Informe Trimestral de Inventarios IMMEX', descripcion: 'Envío del reporte de control de inventarios de mercancías bajo régimen temporal IMMEX.', articulos: 'Art. 24 Frac. IV Decreto IMMEX', categoria: 'immex', presentacion: 'Trimestral' },
    { nombre: 'Constancia de Destrucción de Mermas IMMEX', descripcion: 'Acreditar ante la SE la destrucción de mermas y desperdicios generados bajo el programa IMMEX.', articulos: 'Art. 35 Decreto IMMEX', categoria: 'immex', presentacion: 'Trimestral' },
    { nombre: 'Renovación Anual Programa IMMEX', descripcion: 'Presentar ante la SE la solicitud de renovación del programa IMMEX conforme al Decreto.', articulos: 'Art. 10 Decreto IMMEX', categoria: 'immex', presentacion: 'Anual' },
  ],
  prosec: [
    { nombre: 'Informe de Utilización PROSEC', descripcion: 'Reportar ante la SE la utilización de los beneficios arancelarios del programa PROSEC en el semestre anterior.', articulos: 'Acuerdo PROSEC Art. 12', categoria: 'prosec', presentacion: 'Semestral' },
    { nombre: 'Renovación Anual Programa PROSEC', descripcion: 'Presentar ante la SE la solicitud de renovación del programa PROSEC conforme al Acuerdo.', articulos: 'Acuerdo PROSEC Art. 8', categoria: 'prosec', presentacion: 'Anual' },
  ],
  padron: [
    { nombre: 'Verificación de Datos Padrón de Importadores', descripcion: 'Verificar y actualizar los datos en el Padrón General de Importadores ante el SAT para mantener la vigencia del padrón.', articulos: 'Regla 1.3.1 RMF 2026', categoria: 'padron', presentacion: 'Anual' },
    { nombre: 'Declaración de Valor (Forma A1) — Muestreo', descripcion: 'Presentar las declaraciones de valor de las importaciones muestreadas conforme a la metodología GATT.', articulos: 'Art. 64 Ley Aduanera', categoria: 'padron', presentacion: 'Mensual' },
  ],
  cert_iva_ieps: [
    { nombre: 'Declaración Mensual IVA/IEPS (Certificación)', descripcion: 'Presentar la declaración mensual de IVA al 0% y IEPS correspondiente al periodo, amparo de la certificación IVA/IEPS vigente.', articulos: 'Art. 5-D LIVA; RMF 2026 2.1.6', categoria: 'cert_iva_ieps', presentacion: 'Mensual' },
    { nombre: 'Renovación Certificación IVA/IEPS', descripcion: 'Tramitar la renovación de la certificación IVA/IEPS ante el SAT antes del vencimiento.', articulos: 'RMF 2026 Regla 7.2.3', categoria: 'cert_iva_ieps', presentacion: 'Anual' },
  ],
  oea: [
    { nombre: 'Actualización Matriz de Seguridad OEA', descripcion: 'Actualizar y remitir ante el SAT la matriz de seguridad requerida para el mantenimiento de la certificación OEA vigente.', articulos: 'Regla 7.2.1 RMF 2026', categoria: 'cert_iva_ieps', presentacion: 'Anual' },
    { nombre: 'Reporte Semestral Operaciones OEA', descripcion: 'Presentar el reporte semestral de operaciones de comercio exterior al amparo de la certificación OEA.', articulos: 'Regla 7.2.2 RMF 2026', categoria: 'cert_iva_ieps', presentacion: 'Semestral' },
  ],
  general: [
    { nombre: 'Reporte de Operaciones Vuelta Larga (OVL)', descripcion: 'Presentar ante el ACFI el informe mensual de operaciones vuelta larga.', articulos: 'RMF 2026 Regla 3.1.33', categoria: 'general', presentacion: 'Mensual' },
    { nombre: 'Declaración Anual de Contribuciones Comercio Exterior', descripcion: 'Presentar la declaración anual consolidada de contribuciones relacionadas con operaciones de comercio exterior.', articulos: 'CFF Art. 32', categoria: 'general', presentacion: 'Anual' },
  ],
};

const PROGRAMAS = [
  { key: 'immex',         label: 'IMMEX',                  icon: '🏭', desc: 'Industria Manufacturera, Maquiladora y de Servicios de Exportación' },
  { key: 'prosec',        label: 'PROSEC',                 icon: '📊', desc: 'Programas de Promoción Sectorial' },
  { key: 'padron',        label: 'Padrón de Importadores', icon: '📋', desc: 'Padrón General y Sectoriales' },
  { key: 'cert_iva_ieps', label: 'Cert. IVA/IEPS',        icon: '🛡️', desc: 'Certificación de IVA e IEPS' },
  { key: 'oea',           label: 'OEA',                    icon: '⭐', desc: 'Operador Económico Autorizado' },
  { key: 'general',       label: 'Obligaciones Generales', icon: '📁', desc: 'OVL, declaraciones y obligaciones comunes' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < current ? 'bg-success text-white' :
            i === current ? 'bg-primary text-white' :
            'bg-muted text-muted-foreground'
          }`}>
            {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded ${i < current ? 'bg-success' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaCreated: () => void;
}

export default function OnboardingEmpresaWizard({ open, onOpenChange, onEmpresaCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdEmpresaId, setCreatedEmpresaId] = useState<string | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  const [formData, setFormData] = useState({
    razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set(['general']));
  const [selectedObligaciones, setSelectedObligaciones] = useState<Set<string>>(new Set(
    OBLIGACIONES_POR_PROGRAMA['general'].map((_, i) => `general-${i}`)
  ));

  const toggleProgram = (key: string) => {
    const next = new Set(selectedPrograms);
    const nextObs = new Set(selectedObligaciones);
    if (next.has(key)) {
      if (key === 'general') return;
      next.delete(key);
      OBLIGACIONES_POR_PROGRAMA[key]?.forEach((_, i) => nextObs.delete(`${key}-${i}`));
    } else {
      next.add(key);
      OBLIGACIONES_POR_PROGRAMA[key]?.forEach((_, i) => nextObs.add(`${key}-${i}`));
    }
    setSelectedPrograms(next);
    setSelectedObligaciones(nextObs);
  };

  const toggleObligacion = (key: string) => {
    const next = new Set(selectedObligaciones);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedObligaciones(next);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.razon_social.trim()) errs.razon_social = 'Requerido';
    if (!formData.rfc.trim()) errs.rfc = 'Requerido';
    else if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(formData.rfc.trim().toUpperCase()))
      errs.rfc = 'RFC inválido';
    if (!formData.domicilio_fiscal.trim()) errs.domicilio_fiscal = 'Requerido';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateEmpresa = async () => {
    if (!validate()) return;
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
      setCreatedEmpresaId(data.id);
      setStep(1);
    } catch (e: any) {
      toast.error(e.message || 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateObligaciones = async () => {
    if (!createdEmpresaId) return;
    setLoading(true);
    const toInsert: any[] = [];
    const baseDate = new Date();

    selectedPrograms.forEach(prog => {
      const templates = OBLIGACIONES_POR_PROGRAMA[prog] || [];
      templates.forEach((tmpl, i) => {
        const key = `${prog}-${i}`;
        if (!selectedObligaciones.has(key)) return;
        let fechaVenc: Date;
        switch (tmpl.presentacion.toLowerCase()) {
          case 'mensual':    fechaVenc = addMonths(baseDate, 1); break;
          case 'bimestral':  fechaVenc = addMonths(baseDate, 2); break;
          case 'trimestral': fechaVenc = addMonths(baseDate, 3); break;
          case 'semestral':  fechaVenc = addMonths(baseDate, 6); break;
          case 'anual':      fechaVenc = addYears(baseDate, 1); break;
          default:           fechaVenc = addMonths(baseDate, 1);
        }
        toInsert.push({
          empresa_id: createdEmpresaId,
          nombre: tmpl.nombre,
          descripcion: tmpl.descripcion,
          articulos: tmpl.articulos,
          categoria: tmpl.categoria,
          presentacion: tmpl.presentacion,
          fecha_vencimiento: format(fechaVenc, 'yyyy-MM-dd'),
          estado: 'vigente',
          activa: true,
        });
      });
    });

    try {
      if (toInsert.length > 0) {
        const { error } = await supabase.from('obligaciones').insert(toInsert);
        if (error) throw error;
      }
      setGeneratedCount(toInsert.length);
      setStep(2);
    } catch (e: any) {
      toast.error('Error al generar obligaciones: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setStep(0);
    setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '' });
    setSelectedPrograms(new Set(['general']));
    setSelectedObligaciones(new Set(OBLIGACIONES_POR_PROGRAMA['general'].map((_, i) => `general-${i}`)));
    setCreatedEmpresaId(null);
    setGeneratedCount(0);
    onOpenChange(false);
    onEmpresaCreated();
    toast.success('Empresa configurada con éxito');
  };

  const stepTitles = ['Datos de la empresa', 'Programas activos', '¡Listo!'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto p-0">
        <div className="bg-primary px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-lg">
              {step < 2 ? 'Nueva Empresa' : '¡Empresa configurada!'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-primary-foreground/70 text-sm mt-1">{stepTitles[step]}</p>
          <div className="mt-4">
            <StepIndicator current={step} total={3} />
          </div>
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Razón Social *</Label>
                <Input className="mt-1" placeholder="Ej. Grupo Industrial Norte S.A. de C.V." value={formData.razon_social} onChange={e => setFormData(p => ({ ...p, razon_social: e.target.value }))} />
                {errors.razon_social && <p className="text-xs text-destructive mt-1">{errors.razon_social}</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">RFC *</Label>
                <Input className="mt-1 uppercase" placeholder="Ej. GIN980512AB3" value={formData.rfc} onChange={e => setFormData(p => ({ ...p, rfc: e.target.value.toUpperCase() }))} />
                {errors.rfc && <p className="text-xs text-destructive mt-1">{errors.rfc}</p>}
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Domicilio Fiscal *</Label>
                <Input className="mt-1" placeholder="Calle, número, colonia, municipio, estado, CP" value={formData.domicilio_fiscal} onChange={e => setFormData(p => ({ ...p, domicilio_fiscal: e.target.value }))} />
                {errors.domicilio_fiscal && <p className="text-xs text-destructive mt-1">{errors.domicilio_fiscal}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teléfono</Label>
                  <Input className="mt-1" placeholder="Ej. 664 123 4567" value={formData.telefono} onChange={e => setFormData(p => ({ ...p, telefono: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actividad Económica</Label>
                  <Input className="mt-1" placeholder="Ej. Manufactura" value={formData.actividad_economica} onChange={e => setFormData(p => ({ ...p, actividad_economica: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleCreateEmpresa} disabled={loading} className="gap-2">
                  {loading ? 'Creando...' : 'Continuar'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Selecciona los programas activos. Se generarán automáticamente las obligaciones recurrentes correspondientes.</p>
              <div className="grid grid-cols-2 gap-2">
                {PROGRAMAS.map(p => (
                  <button key={p.key} onClick={() => toggleProgram(p.key)} disabled={p.key === 'general'}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      selectedPrograms.has(p.key) ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-muted-foreground/40'
                    } ${p.key === 'general' ? 'opacity-70' : ''}`}>
                    <span className="text-xl shrink-0">{p.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{p.desc}</p>
                    </div>
                    {selectedPrograms.has(p.key) && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-auto mt-0.5" />}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Obligaciones a generar ({selectedObligaciones.size})</p>
                <div className="border border-border rounded-lg overflow-hidden max-h-[260px] overflow-y-auto">
                  {Array.from(selectedPrograms).map(prog => {
                    const templates = OBLIGACIONES_POR_PROGRAMA[prog] || [];
                    if (templates.length === 0) return null;
                    return (
                      <div key={prog}>
                        <div className="bg-muted/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {PROGRAMAS.find(p => p.key === prog)?.label}
                        </div>
                        {templates.map((tmpl, i) => {
                          const key = `${prog}-${i}`;
                          return (
                            <label key={key} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer border-b border-border last:border-0">
                              <Checkbox checked={selectedObligaciones.has(key)} onCheckedChange={() => toggleObligacion(key)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{tmpl.nombre}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-[10px] py-0">{tmpl.presentacion}</Badge>
                                  <span className="text-[10px] text-muted-foreground">{tmpl.articulos}</span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-2"><ChevronLeft className="w-4 h-4" /> Atrás</Button>
                <Button onClick={handleGenerateObligaciones} disabled={loading || selectedObligaciones.size === 0} className="gap-2">
                  {loading ? 'Generando...' : `Generar ${selectedObligaciones.size} obligación${selectedObligaciones.size !== 1 ? 'es' : ''}`}
                  <Zap className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-foreground">¡Empresa configurada!</h3>
                <p className="text-muted-foreground text-sm mt-1">{formData.razon_social}</p>
              </div>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <div className="flex items-center gap-3 bg-success/10 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                  <span className="text-sm font-medium text-success">Empresa registrada en el sistema</span>
                </div>
                <div className="flex items-center gap-3 bg-primary/10 rounded-lg px-4 py-3">
                  <Zap className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm font-medium text-primary">{generatedCount} obligaciones generadas automáticamente</span>
                </div>
                <div className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3">
                  <FileCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Las obligaciones ya aparecen en el calendario</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Puedes agregar o editar obligaciones desde la página de la empresa en cualquier momento.</p>
              <Button onClick={handleFinish} size="lg" className="w-full mt-2">Ir a la empresa →</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
