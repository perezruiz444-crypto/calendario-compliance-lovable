import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmpresaFormIMMEXProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EmpresaFormIMMEX({ formData, setFormData }: EmpresaFormIMMEXProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold">Programa IMMEX</h3>
      
      <div className="space-y-2">
        <Label htmlFor="immex_numero" className="font-heading">Número de Registro</Label>
        <Input
          id="immex_numero"
          value={formData.immex_numero || ''}
          onChange={(e) => setFormData({ ...formData, immex_numero: e.target.value })}
          maxLength={50}
          className="font-body"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="immex_modalidad" className="font-heading">Modalidad</Label>
        <Input
          id="immex_modalidad"
          value={formData.immex_modalidad || ''}
          onChange={(e) => setFormData({ ...formData, immex_modalidad: e.target.value })}
          maxLength={100}
          className="font-body"
        />
      </div>

      <div className="space-y-2">
        <Label className="font-heading">Fecha de Autorización</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.immex_fecha_autorizacion && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.immex_fecha_autorizacion ? (
                format(new Date(formData.immex_fecha_autorizacion), "PPP")
              ) : (
                <span>Seleccionar fecha</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.immex_fecha_autorizacion ? new Date(formData.immex_fecha_autorizacion) : undefined}
              onSelect={(date) => setFormData({ ...formData, immex_fecha_autorizacion: date?.toISOString().split('T')[0] })}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}