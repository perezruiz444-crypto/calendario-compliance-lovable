import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ClipboardList, Building2, Calendar, CheckCircle2, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import {
  getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS,
  getVencimientoInfo, formatDateShort, getNextVencimiento, isRecurring,
} from '@/lib/obligaciones';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ObligacionesActivasTab() {
  const { user } = useAuth();
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientoKeys, setCumplimientoKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObligaciones();
  }, []);

  const fetchObligaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('obligaciones')
      .select('*, empresas(razon_social)')
      .eq('activa', true)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const obs = data || [];
    setObligaciones(obs);

    if (obs.length > 0) {
      const obIds = obs.map(o => o.id);
      const { data: cData } = await supabase
        .from('obligacion_cumplimientos')
        .select('obligacion_id, periodo_key')
        .in('obligacion_id', obIds);
      if (cData) {
        const keys = new Set<string>();
        cData.forEach(c => keys.add(`${c.obligacion_id}:${c.periodo_key}`));
        setCumplimientoKeys(keys);
      }
    }
    setLoading(false);
  };

  const toggleCumplimiento = async (obligacionId: string, periodKey: string) => {
    if (!user) return;
    const mapKey = `${obligacionId}:${periodKey}`;
    const isCompleted = cumplimientoKeys.has(mapKey);

    if (isCompleted) {
      const { error } = await supabase.from('obligacion_cumplimientos').delete()
        .eq('obligacion_id', obligacionId).eq('periodo_key', periodKey);
      if (error) { toast.error('Error al desmarcar'); return; }
      setCumplimientoKeys(prev => { const n = new Set(prev); n.delete(mapKey); return n; });
      toast.success('Cumplimiento desmarcado');
    } else {
      const { error } = await supabase.from('obligacion_cumplimientos').insert({
        obligacion_id: obligacionId, periodo_key: periodKey, completada_por: user.id,
      });
      if (error) { toast.error('Error al marcar cumplimiento'); return; }
      setCumplimientoKeys(prev => new Set(prev).add(mapKey));
      toast.success('Período completado');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (obligaciones.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <ClipboardList className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-2">Sin obligaciones activas</h3>
        <p className="text-sm text-muted-foreground font-body">
          Las obligaciones activadas aparecerán aquí
        </p>
      </div>
    );
  }

  // Calculate next vencimiento for each obligation
  const obWithNext = obligaciones.map(ob => {
    const next = getNextVencimiento(ob.fecha_vencimiento, ob.presentacion, cumplimientoKeys, ob.id);
    return { ...ob, _next: next };
  });

  // Sort by next vencimiento date
  obWithNext.sort((a, b) => {
    if (!a._next && !b._next) return 0;
    if (!a._next) return 1;
    if (!b._next) return -1;
    return a._next.date.getTime() - b._next.date.getTime();
  });

  const pendientes = obWithNext.filter(ob => {
    if (!ob._next) return true;
    return !cumplimientoKeys.has(`${ob.id}:${ob._next.periodKey}`);
  });

  const completadas = obWithNext.filter(ob => {
    if (!ob._next) return false;
    return cumplimientoKeys.has(`${ob.id}:${ob._next.periodKey}`);
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <Zap className="w-3 h-3" /> {obligaciones.length} activas
        </Badge>
        <Badge className="bg-success/20 text-success border-success/30 gap-1">
          <CheckCircle2 className="w-3 h-3" /> {completadas.length} completadas
        </Badge>
        <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
          <AlertCircle className="w-3 h-3" /> {pendientes.length} pendientes
        </Badge>
      </div>

      {/* List */}
      <div className="space-y-3">
        {obWithNext.map(ob => {
          const next = ob._next;
          const periodKey = next?.periodKey || getCurrentPeriodKey(ob.presentacion);
          const mapKey = `${ob.id}:${periodKey}`;
          const isCompleted = cumplimientoKeys.has(mapKey);
          const recurring = isRecurring(ob.presentacion);

          // Use next calculated date for vencimiento info
          const displayDate = next ? format(next.date, 'dd/MM/yyyy') : formatDateShort(ob.fecha_vencimiento);
          const vInfo = next ? getVencimientoInfo(format(next.date, 'yyyy-MM-dd')) : getVencimientoInfo(ob.fecha_vencimiento);

          return (
            <div key={ob.id} className={`group relative p-4 border rounded-lg transition-all bg-card hover:shadow-md ${isCompleted ? 'bg-success/5 border-success/30' : ''}`}
              style={{
                borderLeft: `3px solid ${
                  vInfo?.status === 'vencido' ? 'hsl(var(--destructive))' :
                  vInfo?.status === 'urgente' ? 'hsl(25, 95%, 53%)' :
                  vInfo?.status === 'proximo' ? 'hsl(var(--warning))' :
                  'hsl(var(--success))'
                }`
              }}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={() => toggleCumplimiento(ob.id, periodKey)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-heading font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {ob.nombre}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {recurring && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <RefreshCw className="w-3 h-3" />
                          {ob.presentacion}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                        {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                      </Badge>
                    </div>
                  </div>
                  {ob.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{ob.descripcion}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ob.empresas?.razon_social && (
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{ob.empresas.razon_social}</span>
                    )}
                    {ob.presentacion && next && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {getPeriodLabel(ob.presentacion, periodKey)}
                      </span>
                    )}
                    {next && (
                      <span className={`flex items-center gap-1 font-medium ${vInfo?.status === 'vencido' || vInfo?.status === 'urgente' ? 'text-destructive' : ''}`}>
                        {recurring ? 'Próximo:' : 'Vence:'} {displayDate}
                      </span>
                    )}
                  </div>
                </div>
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-1" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}