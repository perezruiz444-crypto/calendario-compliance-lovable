import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmpresaFormCertificacionProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EmpresaFormCertificacion({ formData, setFormData }: EmpresaFormCertificacionProps) {
  const renderDatePicker = (field: string, label: string) => (
    <div className="space-y-2">
      <Label className="font-heading">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !formData[field] && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formData[field] ? (
              format(new Date(formData[field]), "PPP")
            ) : (
              <span>Seleccionar fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={formData[field] ? new Date(formData[field]) : undefined}
            onSelect={(date) => setFormData({ ...formData, [field]: date?.toISOString().split('T')[0] })}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold">Certificación IVA e IEPS</h3>
      
      <div className="space-y-2">
        <Label htmlFor="cert_iva_ieps_oficio" className="font-heading">Oficio de Autorización</Label>
        <Input
          id="cert_iva_ieps_oficio"
          value={formData.cert_iva_ieps_oficio || ''}
          onChange={(e) => setFormData({ ...formData, cert_iva_ieps_oficio: e.target.value })}
          maxLength={100}
          className="font-body"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {renderDatePicker('cert_iva_ieps_fecha_autorizacion', 'Fecha de Autorización')}
        {renderDatePicker('cert_iva_ieps_fecha_ultima_renovacion', 'Fecha de Última Renovación')}
        {renderDatePicker('cert_iva_ieps_fecha_vencimiento', 'Fecha de Vencimiento')}
        {renderDatePicker('cert_iva_ieps_fecha_renovar', 'Fecha para Renovar')}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cert_iva_ieps_nota" className="font-heading">Nota</Label>
        <Textarea
          id="cert_iva_ieps_nota"
          value={formData.cert_iva_ieps_nota || ''}
          onChange={(e) => setFormData({ ...formData, cert_iva_ieps_nota: e.target.value })}
          placeholder="Ej: 30 días hábiles antes"
          maxLength={200}
          className="font-body"
          rows={2}
        />
      </div>
    </div>
  );
}