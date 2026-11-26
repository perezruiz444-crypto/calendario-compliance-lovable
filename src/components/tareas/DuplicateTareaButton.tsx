import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Tarea } from '@/types/domain';
import type { TareaPrioridad } from '@/types';

/** Datos de formulario que se precargan al duplicar una tarea. */
export interface TareaDuplicada {
  titulo: string;
  descripcion: string;
  prioridad: TareaPrioridad;
  empresa_id: string;
  consultor_asignado_id: string;
  categoria_id: string;
  fecha_vencimiento: string;
  es_recurrente: boolean;
  frecuencia_recurrencia: string;
  intervalo_recurrencia: number;
  fecha_inicio_recurrencia: string;
  fecha_fin_recurrencia: string;
}

interface DuplicateTareaButtonProps {
  tarea: Pick<Tarea, 'titulo' | 'descripcion' | 'prioridad' | 'empresa_id' | 'consultor_asignado_id' | 'categoria_id'>;
  onDuplicate: (data: TareaDuplicada) => void;
}

export function DuplicateTareaButton({ tarea, onDuplicate }: DuplicateTareaButtonProps) {
  const handleDuplicate = () => {
    const duplicateData: TareaDuplicada = {
      titulo: `${tarea.titulo} (Copia)`,
      descripcion: tarea.descripcion || '',
      prioridad: tarea.prioridad ?? 'media',
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
