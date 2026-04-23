import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CalendarClock, CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCurrentPeriodKey } from '@/lib/obligaciones';

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  fecha_vencimiento: string | null;
  catalogo_id: string | null;
}

interface Props {
  empresaId: string;
  /** Cuando el cliente quiere subir evidencia */
  onSubirEvidencia: (ob: { id: string; nombre: string; presentacion: string | null; periodoKey: string }) => void;
  /** Bump para forzar refetch desde el padre */
  refreshKey?: number;
}

export default function MisVencimientos({ empresaId, onSubirEvidencia, refreshKey = 0 }: Props) {
  const [obs, setObs] = useState<Obligacion[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      // Próximas 10 obligaciones desde hoy
      const { data } = await supabase
        .from('obligaciones')
        .select('id, nombre, categoria, presentacion, fecha_vencimiento, catalogo_id')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .not('fecha_vencimiento', 'is', null)
        .gte('fecha_vencimiento', today)
        .order('fecha_vencimiento', { ascending: true })
        .limit(12);
      if (cancelled) return;
      const list = data || [];
      setObs(list);

      if (list.length > 0) {
        const ids = list.map(o => o.id);
        const { data: cData } = await supabase
          .from('obligacion_cumplimientos')
          .select('obligacion_id, periodo_key')
          .in('obligacion_id', ids);
        const map: Record<string, boolean> = {};
        (cData || []).forEach((c: any) => {
          map[`${c.obligacion_id}:${c.periodo_key}`] = true;
        });
        setCumplimientos(map);
      } else {
        setCumplimientos({});
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [empresaId, refreshKey]);

  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Mis próximos vencimientos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">Cargando…</CardContent>
      </Card>
    );
  }

  if (obs.length === 0) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading flex items-center gap-2">
            <CalendarClock className="w-5 h-5" /> Mis próximos vencimientos
          </CardTitle>
          <CardDescription>Aquí verás las obligaciones que tu empresa debe presentar.</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tienes obligaciones próximas. ¡Estás al día!</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por mes
  const grupos = obs.reduce<Record<string, Obligacion[]>>((acc, ob) => {
    const key = format(startOfMonth(parseISO(ob.fecha_vencimiento!)), 'yyyy-MM');
    (acc[key] ||= []).push(ob);
    return acc;
  }, {});

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading flex items-center gap-2">
          <CalendarClock className="w-5 h-5" /> Mis próximos vencimientos
        </CardTitle>
        <CardDescription>
          Lo que tu empresa necesita presentar — agrupado por mes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {Object.entries(grupos).map(([mesKey, items]) => (
          <div key={mesKey}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {format(parseISO(mesKey + '-01'), "MMMM yyyy", { locale: es })}
            </p>
            <div className="space-y-2">
              {items.map(ob => {
                const fecha = parseISO(ob.fecha_vencimiento!);
                const dias = differenceInDays(fecha, new Date());
                const periodKey = getCurrentPeriodKey(ob.presentacion);
                const cumplida = !!cumplimientos[`${ob.id}:${periodKey}`];
                const isUrgente = dias <= 7 && !cumplida;
                const isRecurrente = !!ob.catalogo_id;

                return (
                  <div
                    key={ob.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      cumplida
                        ? 'bg-success/5 border-success/20'
                        : isUrgente
                          ? 'bg-destructive/5 border-destructive/20'
                          : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex-shrink-0 text-center w-12">
                      <p className="text-2xl font-heading font-bold leading-none">
                        {format(fecha, 'd')}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider mt-0.5">
                        {format(fecha, 'MMM', { locale: es })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold leading-snug truncate">{ob.nombre}</p>
                        {isRecurrente && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Recurrente</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cumplida
                          ? '✓ Cumplida este periodo'
                          : isUrgente
                            ? `⚠ Vence en ${dias} día${dias === 1 ? '' : 's'}`
                            : `En ${dias} días`}
                      </p>
                    </div>

                    {!cumplida && (
                      <Button
                        size="sm"
                        variant={isUrgente ? 'default' : 'outline'}
                        onClick={() => onSubirEvidencia({
                          id: ob.id,
                          nombre: ob.nombre,
                          presentacion: ob.presentacion,
                          periodoKey: periodKey,
                        })}
                        className="flex-shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Cumplir
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
