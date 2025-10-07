import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmpresaFormGeneralProps {
  formData: any;
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
}

export default function EmpresaFormGeneral({ formData, setFormData, errors = {} }: EmpresaFormGeneralProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold">Información General de la Empresa</h3>
      
      <div className="space-y-2">
        <Label htmlFor="razon_social" className="font-heading">Razón Social *</Label>
        <Input
          id="razon_social"
          value={formData.razon_social || ''}
          onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
          required
          maxLength={200}
          className="font-body"
        />
        {errors.razon_social && <p className="text-sm text-destructive font-body">{errors.razon_social}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="rfc" className="font-heading">RFC *</Label>
        <Input
          id="rfc"
          value={formData.rfc || ''}
          onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
          required
          maxLength={13}
          placeholder="AAA123456A12"
          className="font-body"
        />
        {errors.rfc && <p className="text-sm text-destructive font-body">{errors.rfc}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="actividad_economica" className="font-heading">Actividad Económica</Label>
        <Input
          id="actividad_economica"
          value={formData.actividad_economica || ''}
          onChange={(e) => setFormData({ ...formData, actividad_economica: e.target.value })}
          maxLength={200}
          className="font-body"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domicilio_fiscal" className="font-heading">Domicilio Fiscal *</Label>
        <Textarea
          id="domicilio_fiscal"
          value={formData.domicilio_fiscal || ''}
          onChange={(e) => setFormData({ ...formData, domicilio_fiscal: e.target.value })}
          required
          maxLength={500}
          className="font-body"
          rows={3}
        />
        {errors.domicilio_fiscal && <p className="text-sm text-destructive font-body">{errors.domicilio_fiscal}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="telefono" className="font-heading">Teléfono</Label>
        <Input
          id="telefono"
          type="tel"
          value={formData.telefono || ''}
          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          maxLength={20}
          placeholder="5512345678"
          className="font-body"
        />
      </div>
    </div>
  );
}