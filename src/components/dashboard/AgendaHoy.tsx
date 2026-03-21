import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentPeriodKey, formatDateShort, CATEGORIA_LABELS, CATEGORIA_COLORS } from '@/lib/obligaciones';
import { differenceInDays, isToday, isTomorrow, isPast, isValid, startOfDay, endOfDay, addDays } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, Building2, ChevronRight, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface AgendaItem {
  id: string;
  nombre: string;
  empresa: string;
  empresaId: string;
  tipo: 'obligacion' | 'tarea' | 'programa';
  urgency: 'vencida' | 'hoy' | 'manana';
  categoria?: string;
  isCumplida?: boolean;
}

export default function AgendaHoy() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchItems(); }, [user]);

  const fetchItems = async () => {
    setLoading(true);
    const hoy = new Date();
    const manana = addDays(hoy, 1);
    const rangeFin = addDays(hoy, 1).toISOString().split('T')[0];
    const rangeInicio = addDays(hoy, -30).toISOString().split('T')[0];

    const result: AgendaItem[] = [];

    const { data: obs } = await supabase
      .from('obligaciones')
      .select('*, empresas(id, razon_social)')
      .eq('activa', true)
      .lte('fecha_vencimiento', rangeFin)
      .gte('fecha_vencimiento', rangeInicio);

    if (obs && obs.length > 0) {
      const { data: cumplData } = await supabase
        .from('obligacion_cumplimientos')
        .select('obligacion_id, periodo_key')
        .in('obligacion_id', obs.map(o => o.id));
      const cumplMap: Record<string, boolean> = {};
      (cumplData || []).forEach(c => { cumplMap[`${c.obligacion_id}:${c.periodo_key}`] = true; });

      obs.forEach(ob => {
        if (!ob.fecha_vencimiento) return;
        const pk = getCurrentPeriodKey(ob.presentacion);
        if (cumplMap[`${ob.id}:${pk}`]) return;
        const d = new Date(ob.fecha_vencimiento);
        if (!isValid(d)) return;
        const urgency = isPast(startOfDay(d)) && !isToday(d) ? 'vencida' : isToday(d) ? 'hoy' : 'manana';
        result.push({
          id: ob.id,
          nombre: ob.nombre,
          empresa: ob.empresas?.razon_social || '',
          empresaId: ob.empresa_id,
          tipo: 'obligacion',
          urgency,
          categoria: ob.categoria,
        });
      });
    }

    const { data: tareas } = await supabase
      .from('tareas')
      .select('*, empresas(id, razon_social)')
      .not('estado', 'in', '(completada,cancelada)')
      .lte('fecha_vencimiento', rangeFin)
      .gte('fecha_vencimiento', rangeInicio);

    (tareas || []).forEach(t => {
      if (!t.fecha_vencimiento) return;
      const d = new Date(t.fecha_vencimiento);
      if (!isValid(d)) return;
      const urgency = isPast(startOfDay(d)) && !isToday(d) ? 'vencida' : isToday(d) ? 'hoy' : 'manana';
      result.push({
        id: t.id,
        nombre: t.titulo,
        empresa: t.empresas?.razon_social || '',
        empresaId: t.empresa_id,
        tipo: 'tarea',
        urgency,
      });
    });

    const order = { vencida: 0, hoy: 1, manana: 2 };
    result.sort((a, b) => order[a.urgency] - order[b.urgency]);

    setItems(result);
    setLoading(false);
  };

  if (loading || items.length === 0) return null;

  const vencidas = items.filter(i => i.urgency === 'vencida');
  const hoy = items.filter(i => i.urgency === 'hoy');
  const manana = items.filter(i => i.urgency === 'manana');

  const urgencyColor = (u: AgendaItem['urgency']) =>
    u === 'vencida' ? 'hsl(var(--destructive))' :
    u === 'hoy'     ? 'hsl(25, 95%, 53%)' :
    'hsl(var(--warning))';

  const urgencyLabel = (u: AgendaItem['urgency']) =>
    u === 'vencida' ? <span className="text-xs font-semibold text-destructive">Vencida</span> :
    u === 'hoy'     ? <span className="text-xs font-semibold text-orange-600">Hoy</span> :
    <span className="text-xs font-semibold text-warning">Mañana</span>;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <Sun className="w-4 h-4 text-warning" />
        <span className="text-sm font-semibold font-heading">Agenda del día</span>
        <div className="flex gap-1.5 ml-auto">
          {vencidas.length > 0 && (
            <span className="text-xs font-semibold bg-destructive/15 text-destructive rounded-full px-2 py-0.5">
              {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
            </span>
          )}
          {hoy.length > 0 && (
            <span className="text-xs font-semibold bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
              {hoy.length} hoy
            </span>
          )}
          {manana.length > 0 && (
            <span className="text-xs font-semibold bg-warning/15 text-warning rounded-full px-2 py-0.5">
              {manana.length} mañana
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {items.slice(0, 6).map(item => (
          <button
            key={`${item.tipo}-${item.id}`}
            onClick={() => item.tipo === 'tarea' ? navigate('/tareas') : navigate(`/empresas/${item.empresaId}`)}
            className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: urgencyColor(item.urgency) }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.nombre}</p>
              {item.empresa && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 shrink-0" />{item.empresa}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {urgencyLabel(item.urgency)}
              {item.categoria && (
                <Badge variant="outline" className={`text-[10px] py-0 hidden sm:inline-flex ${CATEGORIA_COLORS[item.categoria] || ''}`}>
                  {CATEGORIA_LABELS[item.categoria] || item.categoria}
                </Badge>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
          </button>
        ))}
        {items.length > 6 && (
          <div className="px-4 py-2 text-xs text-muted-foreground text-center">
            +{items.length - 6} más — ve al calendario
          </div>
        )}
      </div>
    </div>
  );
}
