import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ClipboardList, Building2, Calendar, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS, getVencimientoInfo, formatDateShort } from '@/lib/obligaciones';
import { differenceInDays } from 'date-fns';

export function ObligacionesActivasTab() {
  const { user } = useAuth();
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
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
        const map: Record<string, boolean> = {};
        cData.forEach(c => { map[`${c.obligacion_id}:${c.periodo_key}`] = true; });
        setCumplimientos(map);
      }
    }
    setLoading(false);
  };

  const toggleCumplimiento = async (obligacionId: string, presentacion: string | null) => {
    if (!user) return;
    const periodKey = getCurrentPeriodKey(presentacion);
    const mapKey = `${obligacionId}:${periodKey}`;
    const isCompleted = cumplimientos[mapKey];

    if (isCompleted) {
      const { error } = await supabase.from('obligacion_cumplimientos').delete()
        .eq('obligacion_id', obligacionId).eq('periodo_key', periodKey);
      if (error) { toast.error('Error al desmarcar'); return; }
      setCumplimientos(prev => ({ ...prev, [mapKey]: false }));
      toast.success('Cumplimiento desmarcado');
    } else {
      const { error } = await supabase.from('obligacion_cumplimientos').insert({
        obligacion_id: obligacionId, periodo_key: periodKey, completada_por: user.id,
      });
      if (error) { toast.error('Error al marcar cumplimiento'); return; }
      setCumplimientos(prev => ({ ...prev, [mapKey]: true }));
      toast.success(`Completada - ${getPeriodLabel(presentacion, periodKey)}`);
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

  const pendientes = obligaciones.filter(ob => {
    const pk = getCurrentPeriodKey(ob.presentacion);
    return !cumplimientos[`${ob.id}:${pk}`];
  });

  const completadas = obligaciones.filter(ob => {
    const pk = getCurrentPeriodKey(ob.presentacion);
    return cumplimientos[`${ob.id}:${pk}`];
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
        {obligaciones.map(ob => {
          const periodKey = getCurrentPeriodKey(ob.presentacion);
          const mapKey = `${ob.id}:${periodKey}`;
          const isCompleted = cumplimientos[mapKey] || false;
          const vInfo = getVencimientoInfo(ob.fecha_vencimiento);

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
                  onCheckedChange={() => toggleCumplimiento(ob.id, ob.presentacion)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-heading font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {ob.nombre}
                    </h4>
                    <Badge variant="outline" className={`text-xs shrink-0 ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                      {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                    </Badge>
                  </div>
                  {ob.descripcion && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{ob.descripcion}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ob.empresas?.razon_social && (
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{ob.empresas.razon_social}</span>
                    )}
                    {ob.presentacion && (
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{getPeriodLabel(ob.presentacion, periodKey)}</span>
                    )}
                    {ob.fecha_vencimiento && (
                      <span className={`flex items-center gap-1 ${vInfo?.status === 'vencido' || vInfo?.status === 'urgente' ? 'text-destructive font-medium' : ''}`}>
                        Vence: {formatDateShort(ob.fecha_vencimiento)}
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
