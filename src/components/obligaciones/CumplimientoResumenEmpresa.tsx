import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS } from '@/lib/obligaciones';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { empresaId: string; }

export function CumplimientoResumenEmpresa({ empresaId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [empresaId]);

  const fetchData = async () => {
    setLoading(true);

    const { data: obs } = await supabase
      .from('obligaciones')
      .select('id, nombre, categoria, presentacion')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('categoria');

    if (!obs || obs.length === 0) { setLoading(false); return; }

    const { data: cumplData } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key')
      .in('obligacion_id', obs.map(o => o.id));

    const cumplSet = new Set((cumplData || []).map(c => `${c.obligacion_id}:${c.periodo_key}`));

    // Generar últimos 6 periodos (mensuales como base)
    const now = new Date();
    const lastPeriodos = Array.from({ length: 6 }, (_, i) => {
      const d = addMonths(now, -(5 - i));
      return format(d, 'yyyy-MM');
    });
    setPeriodos(lastPeriodos);

    const result = obs.map(ob => ({
      ...ob,
      cumplimientos: lastPeriodos.map(p => {
        const key = `${ob.id}:${p}`;
        // También verificar con el period key real de la obligación
        const pk = getCurrentPeriodKey(ob.presentacion);
        const isCurrentPeriod = pk === p || pk.startsWith(p);
        return {
          periodo: p,
          cumplida: cumplSet.has(key) || cumplSet.has(`${ob.id}:${pk}`) && isCurrentPeriod,
        };
      }),
    }));

    setRows(result);
    setLoading(false);
  };

  if (loading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sin obligaciones activas</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium text-muted-foreground w-64">Obligación</th>
            {periodos.map(p => (
              <th key={p} className="text-center p-2 font-medium text-muted-foreground text-xs whitespace-nowrap">
                {format(new Date(p + '-01'), 'MMM yy', { locale: es })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(ob => (
            <tr key={ob.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                    {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                  </Badge>
                  <span className="truncate max-w-[160px] text-xs font-medium">{ob.nombre}</span>
                </div>
              </td>
              {ob.cumplimientos.map((c: any) => (
                <td key={c.periodo} className="p-2 text-center">
                  {c.cumplida
                    ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                    : <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
