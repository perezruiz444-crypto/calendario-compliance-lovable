import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaCreated: (empresaId?: string) => void;
}

const PROGRAMAS_OPCIONES = [
  { value: 'immex',       label: 'IMMEX' },
  { value: 'prosec',      label: 'PROSEC' },
  { value: 'padron',      label: 'Padrón de Importadores' },
  { value: 'cert_iva_ieps', label: 'Certificación IVA/IEPS' },
  { value: 'general',     label: 'General' },
] as const;

export default function OnboardingEmpresaWizard({ open, onOpenChange, onEmpresaCreated }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '',
  });
  const [programasSeleccionados, setProgramasSeleccionados] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const togglePrograma = (value: string) => {
    setProgramasSeleccionados(prev =>
      prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
    );
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

  const handleSubmit = async () => {
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

      // Insertar programas seleccionados en empresa_programas
      // (el trigger en DB genera las obligaciones automáticamente)
      if (programasSeleccionados.length > 0) {
        const { error: progError } = await supabase
          .from('empresa_programas')
          .insert(
            programasSeleccionados.map(programa => ({
              empresa_id: data.id,
              programa,
              activo: true,
              fecha_inicio: null,
            }))
          );
        if (progError) throw progError;
      }

      toast.success('Empresa creada correctamente');
      setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '', telefono: '', actividad_economica: '' });
      setProgramasSeleccionados([]);
      setErrors({});
      onOpenChange(false);
      onEmpresaCreated(data.id);
    } catch (e: any) {
      toast.error(e.message || 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <div className="bg-primary px-6 py-5 -mx-6 -mt-6 rounded-t-lg mb-2">
          <DialogHeader>
            <DialogTitle className="text-white font-heading text-lg">Nueva Empresa</DialogTitle>
          </DialogHeader>
          <p className="text-primary-foreground/70 text-sm mt-1">Datos básicos de la empresa</p>
        </div>

        <div className="space-y-4 pt-2">
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
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Programas de Comercio Exterior</Label>
            <div className="mt-2 space-y-2">
              {PROGRAMAS_OPCIONES.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`prog-${value}`}
                    checked={programasSeleccionados.includes(value)}
                    onCheckedChange={() => togglePrograma(value)}
                  />
                  <label htmlFor={`prog-${value}`} className="text-sm cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creando...' : 'Crear empresa'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
