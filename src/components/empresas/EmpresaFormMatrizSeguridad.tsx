import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmpresaFormMatrizSeguridadProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EmpresaFormMatrizSeguridad({ formData, setFormData }: EmpresaFormMatrizSeguridadProps) {
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
      <h3 className="text-lg font-heading font-semibold">Matriz de Seguridad</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {renderDatePicker('matriz_seguridad_fecha_vencimiento', 'Fecha de Vencimiento')}
        {renderDatePicker('matriz_seguridad_fecha_renovar', 'Fecha para Renovar')}
      </div>
    </div>
  );
}