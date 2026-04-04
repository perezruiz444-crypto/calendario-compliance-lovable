import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface CustomFieldInputProps {
  field: {
    id: string;
    nombre: string;
    descripcion?: string;
    tipo: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'currency';
    opciones?: string[];
    requerido: boolean;
  };
  value: string;
  onChange: (value: string) => void;
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const renderInput = () => {
    switch (field.tipo) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.descripcion}
            required={field.requerido}
            className="font-body"
          />
        );

      case 'number':
      case 'currency':
        return (
          <Input
            type="number"
            step={field.tipo === 'currency' ? '0.01' : '1'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.descripcion}
            required={field.requerido}
            className="font-body"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.requerido}
            className="font-body"
          />
        );

      case 'select': {
        const opciones = Array.isArray(field.opciones)
          ? field.opciones 
          : typeof field.opciones === 'string'
          ? JSON.parse(field.opciones)
          : [];
        
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="font-body">
              <SelectValue placeholder={field.descripcion || 'Selecciona una opción'} />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((opcion: string) => (
                <SelectItem key={opcion} value={opcion}>
                  {opcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === 'true'}
              onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
            />
            <Label htmlFor={field.id} className="font-body text-sm cursor-pointer">
              {field.descripcion || 'Activar'}
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label className="font-heading">
        {field.nombre}
        {field.requerido && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {field.descripcion && field.tipo !== 'checkbox' && (
        <p className="text-xs text-muted-foreground font-body">{field.descripcion}</p>
      )}
    </div>
  );
}