import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PROGRAMA_LABELS, PROGRAMA_DESCRIPTIONS } from '@/lib/obligaciones';
import { EmpresaPrograma } from './EmpresaProgramasTab';

interface ProgramaRowProps {
  programa: string;
  registros: EmpresaPrograma[];
  empresaId: string;
  canEdit: boolean;
  onUpdate: () => void;
}

export function ProgramaRow({ programa, registros, empresaId, canEdit, onUpdate }: ProgramaRowProps) {
  const [loading, setLoading] = useState(false);

  // Para padron_sectorial puede haber múltiples registros activos
  const activos = registros.filter(r => r.activo);
  const activo = activos.length > 0;
  const registro = registros[0] ?? null; // primer registro para operaciones simples

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (registros.length === 0) {
        const { error } = await supabase
          .from('empresa_programas')
          .insert({ empresa_id: empresaId, programa, activo: true });
        if (error) throw error;
        toast.success(`${PROGRAMA_LABELS[programa]} activado — obligaciones generadas para ${new Date().getFullYear()}`);
      } else if (activo) {
        // Desactivar todos los registros del programa
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: false })
          .in('id', registros.map(r => r.id));
        if (error) throw error;
        toast.success(`${PROGRAMA_LABELS[programa]} desactivado`);
      } else {
        const { error } = await supabase
          .from('empresa_programas')
          .update({ activo: true })
          .in('id', registros.map(r => r.id));
        if (error) throw error;
        toast.success(`${PROGRAMA_LABELS[programa]} reactivado — obligaciones generadas`);
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

          {/* Múltiples sectores (padron_sectorial) */}
          {activos.length > 1 ? (
            <div className="mt-0.5 space-y-0.5">
              {activos.map(r => (
                <div key={r.id} className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {r.sectores && r.sectores.length > 0 && (
                    <span className="font-medium text-foreground/70">{r.sectores[0]}</span>
                  )}
                  {r.fecha_inicio && (
                    <span>— desde {format(new Date(r.fecha_inicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}</span>
                  )}
                </div>
              ))}
            </div>
          ) : registro?.fecha_inicio ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              Desde {format(new Date(registro.fecha_inicio + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}
            </p>
          ) : null}
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
