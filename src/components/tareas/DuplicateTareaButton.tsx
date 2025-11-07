import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface DuplicateTareaButtonProps {
  tarea: any;
  onDuplicate: (data: any) => void;
}

export function DuplicateTareaButton({ tarea, onDuplicate }: DuplicateTareaButtonProps) {
  const handleDuplicate = () => {
    const duplicateData = {
      titulo: `${tarea.titulo} (Copia)`,
      descripcion: tarea.descripcion || '',
      prioridad: tarea.prioridad,
      empresa_id: tarea.empresa_id,
      consultor_asignado_id: tarea.consultor_asignado_id || '',
      categoria_id: tarea.categoria_id || '',
      fecha_vencimiento: '',
      es_recurrente: false,
      frecuencia_recurrencia: 'mensual',
      intervalo_recurrencia: 1,
      fecha_inicio_recurrencia: '',
      fecha_fin_recurrencia: ''
    };
    
    onDuplicate(duplicateData);
    toast.success('Datos copiados. Modifica y guarda la nueva tarea.');
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDuplicate}
      className="gap-2"
    >
      <Copy className="w-4 h-4" />
      Duplicar
    </Button>
  );
}
