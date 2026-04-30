import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const PROGRAMA_LABELS: Record<string, string> = {
  immex:         'IMMEX',
  prosec:        'PROSEC',
  padron:        'Padrón de Importadores',
  cert_iva_ieps: 'Certificación IVA/IEPS',
  general:       'General',
};

export const PROGRAMA_DESCRIPTIONS: Record<string, string> = {
  immex:         'Industria Manufacturera, Maquiladora y de Servicios de Exportación',
  prosec:        'Programa de Promoción Sectorial',
  padron:        'Padrón General de Importadores SAT',
  cert_iva_ieps: 'Certificación de IVA e IEPS ante el SAT',
  general:       'Obligaciones generales de comercio exterior',
};

interface EmpresaPrograma {
  id: string;
  programa: string;
  activo: boolean;
  fecha_inicio: string | null;
}

interface ProgramaRowProps {
  programa: string;
  registro: EmpresaPrograma | null;
  empresaId: string;
  canEdit: boolean;
  onUpdate: () => void;
}

export function ProgramaRow({ programa, registro, empresaId, canEdit, onUpdate }: ProgramaRowProps) {
  const [loading, setLoading] = useState(false);
  const activo = registro?.activo ?? false;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (!registro) {
        const { error } = await supabase
          .from('empresa_programas')
          .insert({ empresa_id: empresaId, programa, activo: true });
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} activado — obligaciones generadas para ${new Date().getFullYear()}`);
      } else if (activo) {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: false })
          .eq('id', registro.id);
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} desactivado`);
      } else {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: true })
          .eq('id', registro.id);
        if (error) throw error;
        toast.success(`Programa ${PROGRAMA_LABELS[programa]} reactivado — obligaciones generadas`);
      }
      onUpdate();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        {activo
          ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
        }
        <div>
          <p className="text-sm font-medium">{PROGRAMA_LABELS[programa]}</p>
          <p className="text-xs text-muted-foreground">{PROGRAMA_DESCRIPTIONS[programa]}</p>
          {registro?.fecha_inicio && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              Desde {format(new Date(registro.fecha_inicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={activo ? 'default' : 'outline'} className="text-xs">
          {activo ? 'Activo' : 'Inactivo'}
        </Badge>
        {canEdit && (
          <Button
            size="sm"
            variant={activo ? 'outline' : 'default'}
            disabled={loading}
            onClick={handleToggle}
          >
            {loading ? '...' : activo ? 'Desactivar' : 'Activar'}
          </Button>
        )}
      </div>
    </div>
  );
}
