import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import {
  Building2, AlertCircle, CheckCircle2, ArrowRight,
  AlertTriangle, Clock, Calendar, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentPeriodKey, CATEGORIA_LABELS, CATEGORIA_COLORS,
  getVencimientoInfo, formatDateShort,
} from '@/lib/obligaciones';
import { differenceInDays, isPast, isValid } from 'date-fns';

type UrgencyLevel = 'vencida' | 'semana' | 'mes' | 'ok';

function getUrgency(fechaVencimiento: string | null, isCumplida: boolean): UrgencyLevel {
  if (isCumplida) return 'ok';
  if (!fechaVencimiento) return 'ok';
  const d = new Date(fechaVencimiento);
  if (!isValid(d)) return 'ok';
  if (isPast(d)) return 'vencida';
  const days = differenceInDays(d, new Date());
  if (days <= 7) return 'semana';
  if (days <= 30) return 'mes';
  return 'ok';
}

function UrgencyBadge({ fechaVencimiento, isCumplida }: { fechaVencimiento: string | null; isCumplida: boolean }) {
  if (isCumplida) {
    return (
      <Badge className="bg-success/15 text-success border-success/25 text-xs gap-1">
        <CheckCircle2 className="w-3 h-3" /> Cumplida
      </Badge>
    );
  }
  const info = getVencimientoInfo(fechaVencimiento);
  if (!info) return null;
  if (info.status === 'vencido') {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertCircle className="w-3 h-3" /> Vencida hace {Math.abs(info.days)}d
      </Badge>
    );
  }
  if (info.days === 0) {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/25 text-xs gap-1">
        <AlertCircle className="w-3 h-3" /> Vence hoy
      </Badge>
    );
  }
  if (info.status === 'urgente') {
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs gap-1">
        <Clock className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  if (info.status === 'proximo') {
    return (
      <Badge className="bg-warning/15 text-warning border-warning/25 text-xs gap-1">
        <Calendar className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/15 text-success border-success/25 text-xs gap-1">
      <CheckCircle2 className="w-3 h-3" /> Vigente
    </Badge>
  );
}

function SummaryCard({
  count, label, sublabel, colorClass, active, onClick,
}: {
  count: number; label: string; sublabel: string;
  colorClass: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left p-3 rounded-lg border transition-all ${
        active ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-muted-foreground/40'
      } bg-card`}
    >
      <div className={`text-2xl font-bold font-heading ${colorClass}`}>{count}</div>
      <div className="text-xs font-semibold text-foreground mt-0.5">{label}</div>
      <div className="text-xs text-muted-foreground">{sublabel}</div>
    </button>
  );
}

function ObRow({ ob, isCumplida, onClick }: { ob: any; isCumplida: boolean; onClick: () => void }) {
  const urgency = getUrgency(ob.fecha_vencimiento, isCumplida);
  const accentColor =
    urgency === 'vencida' ? 'hsl(var(--destructive))' :
    urgency === 'semana'  ? 'hsl(25, 95%, 53%)' :
    urgency === 'mes'     ? 'hsl(var(--warning))' :
    'hsl(var(--border))';

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 p-3 rounded-lg border hover:border-primary/40 transition-colors group"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate font-heading ${isCumplida ? 'line-through text-muted-foreground' : ''}`}>
          {ob.nombre}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {ob.empresas?.razon_social && (
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3 shrink-0" />
              {ob.empresas.razon_social}
            </span>
          )}
          {ob.fecha_vencimiento && (
            <>
              <span>·</span>
              <span className={urgency === 'vencida' ? 'text-destructive font-medium' : ''}>
                {formatDateShort(ob.fecha_vencimiento)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <UrgencyBadge fechaVencimiento={ob.fecha_vencimiento} isCumplida={isCumplida} />
        <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
          {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
        </Badge>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </button>
  );
}

function GroupHeader({
  icon, label, count, colorClass,
}: { icon: React.ReactNode; label: string; count: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-border mb-2">
      <span className={colorClass}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

type ActiveFilter = 'all' | 'vencidas' | 'semana' | 'mes' | 'cumplidas';

export default function DashboardObligaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  useEffect(() => { fetchObligaciones(); }, [selectedEmpresaId]);

  const fetchObligaciones = async () => {
    setLoading(true);
  let query = supabase
      .from('obligaciones')
      .select('*, empresas(razon_social)')
      .eq('activa', true)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      .limit(30);

    if (selectedEmpresaId && selectedEmpresaId !== 'all') {
      query = query.eq('empresa_id', selectedEmpresaId);
    }

    // Clientes solo ven las obligaciones donde están asignados
    if (role === 'cliente' && user) {
      const { data: asignadas } = await supabase
        .from('obligacion_responsables')
        .select('obligacion_id')
        .eq('user_id', user.id);
      const ids = (asignadas || []).map(a => a.obligacion_id);
      if (ids.length === 0) {
        setObligaciones([]);
        setLoading(false);
        return;
      }
      query = query.in('id', ids);
    }

    const { data, error } = await query;
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

  const classified = obligaciones.map(ob => {
    const pk = getCurrentPeriodKey(ob.presentacion);
    const isCumplida = !!cumplimientos[`${ob.id}:${pk}`];
    const urgency = getUrgency(ob.fecha_vencimiento, isCumplida);
    return { ob, isCumplida, urgency };
  });

  const vencidas  = classified.filter(x => x.urgency === 'vencida');
  const semana    = classified.filter(x => x.urgency === 'semana');
  const mes       = classified.filter(x => x.urgency === 'mes');
  const cumplidas = classified.filter(x => x.isCumplida);

  const filteredItems = (() => {
    if (activeFilter === 'vencidas')  return vencidas;
    if (activeFilter === 'semana')    return semana;
    if (activeFilter === 'mes')       return mes;
    if (activeFilter === 'cumplidas') return cumplidas;
    return classified;
  })();

  const handleObClick = (ob: any) => {
    navigate(`/empresas/${ob.empresa_id}`);
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

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              Obligaciones de Comercio Exterior
            </CardTitle>
            <CardDescription className="font-body">
              Periodo actual · {obligaciones.length} registradas en total
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/empresas')} className="gap-1 shrink-0">
            Ver todas <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        {vencidas.length > 0 && (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 p-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive leading-snug">
              <span className="font-semibold">
                {vencidas.length} obligaci{vencidas.length > 1 ? 'ones vencidas' : 'ón vencida'} sin cumplir.
              </span>
              {' '}
              {vencidas.slice(0, 2).map(x => x.ob.nombre).join(' y ')}
              {vencidas.length > 2 && ` y ${vencidas.length - 2} más`}
              {' '}requieren acción inmediata.
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <SummaryCard
            count={vencidas.length}
            label="Vencidas"
            sublabel="Acción inmediata"
            colorClass="text-destructive"
            active={activeFilter === 'vencidas'}
            onClick={() => setActiveFilter(activeFilter === 'vencidas' ? 'all' : 'vencidas')}
          />
          <SummaryCard
            count={semana.length}
            label="Esta semana"
            sublabel="1–7 días"
            colorClass="text-orange-600"
            active={activeFilter === 'semana'}
            onClick={() => setActiveFilter(activeFilter === 'semana' ? 'all' : 'semana')}
          />
          <SummaryCard
            count={mes.length}
            label="Este mes"
            sublabel="8–30 días"
            colorClass="text-warning"
            active={activeFilter === 'mes'}
            onClick={() => setActiveFilter(activeFilter === 'mes' ? 'all' : 'mes')}
          />
          <SummaryCard
            count={cumplidas.length}
            label="Cumplidas"
            sublabel="Periodo actual"
            colorClass="text-success"
            active={activeFilter === 'cumplidas'}
            onClick={() => setActiveFilter(activeFilter === 'cumplidas' ? 'all' : 'cumplidas')}
          />
        </div>
      </CardHeader>

      <CardContent>
        {activeFilter === 'all' ? (
          <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
            {vencidas.length > 0 && (
              <div>
                <GroupHeader icon={<AlertCircle className="w-3.5 h-3.5" />} label="Vencidas — acción inmediata" count={vencidas.length} colorClass="text-destructive" />
                <div className="space-y-1.5">{vencidas.map(({ ob, isCumplida }) => <ObRow key={ob.id} ob={ob} isCumplida={isCumplida} onClick={() => handleObClick(ob)} />)}</div>
              </div>
            )}
            {semana.length > 0 && (
              <div>
                <GroupHeader icon={<Clock className="w-3.5 h-3.5" />} label="Esta semana" count={semana.length} colorClass="text-orange-500" />
                <div className="space-y-1.5">{semana.map(({ ob, isCumplida }) => <ObRow key={ob.id} ob={ob} isCumplida={isCumplida} onClick={() => handleObClick(ob)} />)}</div>
              </div>
            )}
            {mes.length > 0 && (
              <div>
                <GroupHeader icon={<Calendar className="w-3.5 h-3.5" />} label="Este mes" count={mes.length} colorClass="text-warning" />
                <div className="space-y-1.5">{mes.map(({ ob, isCumplida }) => <ObRow key={ob.id} ob={ob} isCumplida={isCumplida} onClick={() => handleObClick(ob)} />)}</div>
              </div>
            )}
            {vencidas.length === 0 && semana.length === 0 && mes.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">¡Todo al día! No hay obligaciones urgentes</p>
              </div>
            )}
            {cumplidas.length > 0 && (
              <div>
                <GroupHeader icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Cumplidas este periodo" count={cumplidas.length} colorClass="text-success" />
                <div className="space-y-1.5">
                  {cumplidas.slice(0, 4).map(({ ob, isCumplida }) => <ObRow key={ob.id} ob={ob} isCumplida={isCumplida} onClick={() => handleObClick(ob)} />)}
                  {cumplidas.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{cumplidas.length - 4} más cumplidas</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay obligaciones en esta categoría</p>
              </div>
            ) : (
              filteredItems.map(({ ob, isCumplida }) => (
                <ObRow key={ob.id} ob={ob} isCumplida={isCumplida} onClick={() => handleObClick(ob)} />
              ))
            )}
          </div>
        )}

        {activeFilter !== 'all' && (
          <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground text-xs" onClick={() => setActiveFilter('all')}>
            Ver todas las obligaciones
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
