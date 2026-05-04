import { useEffect, useState, useMemo } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useObligacionCumplimientos } from '@/hooks/useObligacionCumplimientos';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  getCurrentPeriodKey, formatDateShort, getVencimientoInfo, getPeriodLabel
} from '@/lib/obligaciones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle,
  ShieldAlert, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ObligacionDetailSheet from '@/components/obligaciones/ObligacionDetailSheet';

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  fecha_vencimiento: string | null;
}

function SemaforoBadge({ fecha, cumplida }: { fecha: string | null; cumplida: boolean }) {
  if (cumplida) return null;
  const info = getVencimientoInfo(fecha);
  if (!info) return null;

  if (info.status === 'vencido') {
    return (
      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30 gap-1 shrink-0">
        <ShieldAlert className="w-3 h-3" /> Vencida
      </Badge>
    );
  }
  if (info.status === 'urgente') {
    return (
      <Badge variant="outline" className="text-xs bg-[hsl(var(--urgent))]/10 text-[hsl(var(--urgent))] border-[hsl(var(--urgent))]/30 gap-1 shrink-0">
        <AlertTriangle className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  if (info.status === 'proximo') {
    return (
      <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 gap-1 shrink-0">
        <Clock className="w-3 h-3" /> {info.days}d
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30 gap-1 shrink-0">
      <CheckCircle2 className="w-3 h-3" /> {info.days}d
    </Badge>
  );
}

export default function DashboardObligacionesMensuales() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();

  const [empresaId, setEmpresaId]         = useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [obligaciones, setObligaciones]   = useState<Obligacion[]>([]);
  const [loading, setLoading]             = useState(true);
  const [ocultarCumplidas, setOcultarCumplidas] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedObId, setSelectedObId] = useState<string | null>(null);

  const { cumplimientos, toggleCumplimiento, toggling } = useObligacionCumplimientos(obligaciones, empresaId);

  // --- resolve empresaId + nombre empresa ---
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    if (role === 'cliente') {
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('empresa_id')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        setEmpresaId(data?.empresa_id ?? null);
        if (!data?.empresa_id) setLoading(false);
      })();
    } else {
      const id = selectedEmpresaId && selectedEmpresaId !== 'all'
        ? selectedEmpresaId : null;
      setEmpresaId(id);
      if (!id) { setEmpresaNombre(''); setObligaciones([]); setLoading(false); }
    }

    return () => { cancelled = true; };
  }, [user, role, selectedEmpresaId]);

  // --- fetch cuando empresaId cambia ---
  useEffect(() => {
    if (!empresaId) return;
    fetchObligaciones();
  }, [empresaId]);

  const fetchObligaciones = async () => {
    if (!empresaId) return;
    setLoading(true);

    const now = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const days  = getDaysInMonth(now);
    const firstDay = `${year}-${month}-01T12:00:00`;
    const lastDay  = `${year}-${month}-${String(days).padStart(2, '0')}T12:00:00`;

    const [{ data: oblData }, { data: empData }] = await Promise.all([
      supabase
        .from('obligaciones')
        .select('id, nombre, categoria, presentacion, fecha_vencimiento')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .gte('fecha_vencimiento', firstDay)
        .lte('fecha_vencimiento', lastDay)
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      supabase
        .from('empresas')
        .select('razon_social')
        .eq('id', empresaId)
        .maybeSingle(),
    ]);

    const obls = (oblData || []) as Obligacion[];
    setObligaciones(obls);
    setEmpresaNombre(empData?.razon_social || '');
    setLoading(false);
  };

  // Ordenamiento inteligente: Vencidas -> Urgentes -> Próximas -> Vigentes -> Cumplidas
  const obligacionesOrdenadas = useMemo(() => {
    let filtradas = obligaciones;
    if (ocultarCumplidas) {
      filtradas = filtradas.filter((o) => !cumplimientos[o.id]);
    }

    return [...filtradas].sort((a, b) => {
      const aCump = cumplimientos[a.id];
      const bCump = cumplimientos[b.id];

      // Cumplidas al final
      if (aCump && !bCump) return 1;
      if (!aCump && bCump) return -1;

      // Orden de Urgencia
      const getUrgencyWeight = (obl: Obligacion) => {
        const info = getVencimientoInfo(obl.fecha_vencimiento);
        if (info?.status === 'vencido') return 0;
        if (info?.status === 'urgente') return 1;
        if (info?.status === 'proximo') return 2;
        return 3;
      };

      const aWeight = getUrgencyWeight(a);
      const bWeight = getUrgencyWeight(b);
      if (aWeight !== bWeight) return aWeight - bWeight;

      // Desempate por fecha
      const aDate = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
      const bDate = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [obligaciones, cumplimientos, ocultarCumplidas]);

  // ── Derivados ──────────────────────────────────────────────────────
  const now       = new Date();
  const mesLabel  = format(now, 'MMMM yyyy', { locale: es });
  const mesTitulo = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const completadas = Object.values(cumplimientos).filter(Boolean).length;
  const pendientes  = obligaciones.length - completadas;

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Sin empresa resuelta ───────────────────────────────────────────
  if (!empresaId) {
    const msg = role === 'cliente'
      ? 'Sin empresa asignada. Contacta al administrador.'
      : 'Selecciona una empresa en la barra lateral para ver sus obligaciones.';
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Obligaciones del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Building2 className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-xs">{msg}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Sin obligaciones en el mes ─────────────────────────────────────
  if (obligaciones.length === 0) {
    const ctaPath  = role === 'cliente' ? '/mi-empresa' : `/empresas/${empresaId}`;
    const ctaLabel = role === 'cliente' ? 'Ver mi empresa' : 'Gestionar obligaciones';
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Obligaciones de {mesTitulo}
          </CardTitle>
          {empresaNombre && (
            <CardDescription>{empresaNombre}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-success/50" />
            <p className="text-sm text-muted-foreground">Sin obligaciones activas este mes</p>
            <Button variant="outline" size="sm" onClick={() => navigate(ctaPath)}>
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Lista normal ───────────────────────────────────────────────────
  return (
    <>
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Obligaciones de {mesTitulo}
            </CardTitle>
            {empresaNombre && (
              <CardDescription className="mt-0.5">
                {empresaNombre} · {obligaciones.length} en {mesLabel}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex gap-1.5">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
                <CheckCircle2 className="w-3 h-3" /> {completadas}
              </Badge>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                <Clock className="w-3 h-3" /> {pendientes}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <label htmlFor="ocultar-cumplidas" className="cursor-pointer select-none hover:text-foreground transition-colors">
                Ocultar cumplidas
              </label>
              <Checkbox 
                id="ocultar-cumplidas" 
                checked={ocultarCumplidas} 
                onCheckedChange={(c) => setOcultarCumplidas(!!c)} 
                className="w-3.5 h-3.5 rounded"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
          {obligacionesOrdenadas.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">Todas las obligaciones están cumplidas 🎉</p>
          ) : (
            obligacionesOrdenadas.map((obl) => {
            const isCompleted = !!cumplimientos[obl.id];
            const info        = getVencimientoInfo(obl.fecha_vencimiento);
            const accentColor =
              isCompleted                   ? 'hsl(var(--success))'     :
              info?.status === 'vencido'    ? 'hsl(var(--destructive))' :
              info?.status === 'urgente'    ? 'hsl(var(--urgent))'       :
              info?.status === 'proximo'    ? 'hsl(var(--warning))'     :
              'hsl(var(--border))';

            return (
              <div
                key={obl.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg transition-colors ${
                  isCompleted ? 'bg-success/5 border-success/20' : 'hover:bg-accent/10'
                }`}
                style={{ borderLeft: `3px solid ${accentColor}` }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={isCompleted}
                    disabled={toggling === obl.id}
                    onCheckedChange={() => toggleCumplimiento(obl)}
                    aria-label={`Marcar ${obl.nombre} como cumplida`}
                    className="shrink-0"
                  />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer hover:underline decoration-muted-foreground/30"
                    onClick={() => {
                      setSelectedObId(obl.id);
                      setSheetOpen(true);
                    }}
                    role="button"
                  >
                    <p className={`font-medium text-sm truncate font-heading ${
                      isCompleted ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {obl.nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <Badge className={`text-xs ${CATEGORIA_COLORS[obl.categoria] || CATEGORIA_COLORS.otro}`}>
                        {CATEGORIA_LABELS[obl.categoria] || obl.categoria}
                      </Badge>
                      {obl.presentacion && (
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">
                          {getPeriodLabel(obl.presentacion, getCurrentPeriodKey(obl.presentacion))}
                        </span>
                      )}
                      {obl.fecha_vencimiento && (
                        <span className="hidden sm:inline">{formatDateShort(obl.fecha_vencimiento)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="self-end sm:self-auto pl-7 sm:pl-0 shrink-0">
                  <SemaforoBadge fecha={obl.fecha_vencimiento} cumplida={isCompleted} />
                </div>
              </div>
            );
            })
          )}
        </div>
      </CardContent>
    </Card>

    <ObligacionDetailSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      obligacionId={selectedObId}
      onCumplimientoChange={fetchObligaciones}
    />
    </>
  );
}
