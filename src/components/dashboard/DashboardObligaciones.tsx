import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ClipboardList, Building2, AlertCircle, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPeriodKey, CATEGORIA_LABELS, CATEGORIA_COLORS, getVencimientoInfo, formatDateShort } from '@/lib/obligaciones';

export default function DashboardObligaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      .limit(10);

    if (error) { setLoading(false); return; }

    const obs = data || [];
    setObligaciones(obs);

    if (obs.length > 0) {
      const { data: cData } = await supabase
        .from('obligacion_cumplimientos')
        .select('obligacion_id, periodo_key')
        .in('obligacion_id', obs.map(o => o.id));
      if (cData) {
        const map: Record<string, boolean> = {};
        cData.forEach(c => { map[`${c.obligacion_id}:${c.periodo_key}`] = true; });
        setCumplimientos(map);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (obligaciones.length === 0) return null;

  const pendientes = obligaciones.filter(ob => {
    const pk = getCurrentPeriodKey(ob.presentacion);
    return !cumplimientos[`${ob.id}:${pk}`];
  });

  const completadas = obligaciones.filter(ob => {
    const pk = getCurrentPeriodKey(ob.presentacion);
    return cumplimientos[`${ob.id}:${pk}`];
  });

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Obligaciones Activas
            </CardTitle>
            <CardDescription className="font-body">
              Pendientes de cumplimiento del periodo actual
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/empresas')} className="gap-1">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge className="bg-success/20 text-success border-success/30 gap-1">
            <CheckCircle2 className="w-3 h-3" /> {completadas.length} completadas
          </Badge>
          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
            <AlertCircle className="w-3 h-3" /> {pendientes.length} pendientes
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {pendientes.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">¡Todo al día! No hay obligaciones pendientes</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {pendientes.slice(0, 8).map(ob => {
              const vInfo = getVencimientoInfo(ob.fecha_vencimiento);
              return (
                <div key={ob.id} className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary/50 transition-colors"
                  style={{
                    borderLeft: `3px solid ${
                      vInfo?.status === 'vencido' ? 'hsl(var(--destructive))' :
                      vInfo?.status === 'urgente' ? 'hsl(25, 95%, 53%)' :
                      'hsl(var(--primary))'
                    }`
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-medium text-sm truncate">{ob.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {ob.empresas?.razon_social && (
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{ob.empresas.razon_social}</span>
                      )}
                      {ob.fecha_vencimiento && (
                        <span className={vInfo?.status === 'vencido' ? 'text-destructive' : ''}>
                          {formatDateShort(ob.fecha_vencimiento)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                    {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
