import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmpresaFormPROSECProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EmpresaFormPROSEC({ formData, setFormData }: EmpresaFormPROSECProps) {
  const [newSector, setNewSector] = useState('');
  const sectores = Array.isArray(formData.prosec_sectores) ? formData.prosec_sectores : [];

  const addSector = () => {
    if (newSector.trim()) {
      const updatedSectores = [...sectores, newSector.trim()];
      setFormData({ ...formData, prosec_sectores: updatedSectores });
      setNewSector('');
    }
  };

  const removeSector = (index: number) => {
    const updatedSectores = sectores.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, prosec_sectores: updatedSectores });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold">Programa PROSEC</h3>
      
      <div className="space-y-2">
        <Label htmlFor="prosec_numero" className="font-heading">Número de Registro</Label>
        <Input
          id="prosec_numero"
          value={formData.prosec_numero || ''}
          onChange={(e) => setFormData({ ...formData, prosec_numero: e.target.value })}
          maxLength={50}
          className="font-body"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="prosec_modalidad" className="font-heading">Modalidad</Label>
        <Input
          id="prosec_modalidad"
          value={formData.prosec_modalidad || ''}
          onChange={(e) => setFormData({ ...formData, prosec_modalidad: e.target.value })}
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
                !formData.prosec_fecha_autorizacion && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.prosec_fecha_autorizacion ? (
                format(new Date(formData.prosec_fecha_autorizacion), "PPP")
              ) : (
                <span>Seleccionar fecha</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <Calendar
              mode="single"
              selected={formData.prosec_fecha_autorizacion ? new Date(formData.prosec_fecha_autorizacion) : undefined}
              onSelect={(date) => setFormData({ ...formData, prosec_fecha_autorizacion: date?.toISOString().split('T')[0] })}
              initialFocus
              captionLayout="buttons"
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label className="font-heading">Sectores</Label>
        <div className="flex gap-2">
          <Input
            value={newSector}
            onChange={(e) => setNewSector(e.target.value)}
            placeholder="Agregar sector"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSector())}
            className="font-body"
          />
          <Button type="button" onClick={addSector} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {sectores.map((sector: string, index: number) => (
            <Badge key={index} variant="secondary" className="font-body">
              {sector}
              <button
                type="button"
                onClick={() => removeSector(index)}
                className="ml-2 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}