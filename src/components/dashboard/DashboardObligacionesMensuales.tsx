import { useEffect, useState, useMemo } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useOcurrenciasCumplimientos } from '@/hooks/useOcurrenciasCumplimientos';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  formatDateShort, getVencimientoInfo, getPeriodLabel
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
import { ObligacionesPorUrgencia } from '@/components/obligaciones/ObligacionesPorUrgencia';

// Fase 2: cada ítem es una OCURRENCIA aplanada (id = ocurrencia_id).
interface Obligacion {
  id: string;               // ocurrencia_id
  obligacion_id: string;    // obligación padre (para el detail sheet)
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
  const [ocultarCumplidas, setOcultarCumplidas] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedObId, setSelectedObId] = useState<string | null>(null);
  const [selectedOcurrenciaId, setSelectedOcurrenciaId] = useState<string | null>(null);

  // Fase 2: ocurrencias + cumplimientos de la empresa (append-only, Realtime).
  const { ocurrencias, cumplimientos, toggleCumplimiento, toggling, loading, refetch: refetchCumplimientos } =
    useOcurrenciasCumplimientos(empresaId);

  // Obligaciones del MES actual, aplanadas desde las ocurrencias del hook.
  const obligaciones = useMemo<Obligacion[]>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return ocurrencias
      .filter((oc) => {
        if (!oc.fecha_vencimiento) return false;
        const d = new Date(oc.fecha_vencimiento + 'T12:00:00');
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .map((oc) => ({
        id: oc.id,
        obligacion_id: oc.obligacion_id,
        nombre: oc.obligaciones?.nombre ?? 'Obligación',
        categoria: oc.obligaciones?.categoria ?? 'otro',
        presentacion: oc.obligaciones?.presentacion ?? null,
        fecha_vencimiento: oc.fecha_vencimiento,
      }));
  }, [ocurrencias]);

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
      })();
    } else {
      const id = selectedEmpresaId && selectedEmpresaId !== 'all'
        ? selectedEmpresaId : null;
      setEmpresaId(id);
      if (!id) setEmpresaNombre('');
    }

    return () => { cancelled = true; };
  }, [user, role, selectedEmpresaId]);

  // Nombre de la empresa
  useEffect(() => {
    if (!empresaId) { setEmpresaNombre(''); return; }
    supabase.from('empresas').select('razon_social').eq('id', empresaId).maybeSingle()
      .then(({ data }) => setEmpresaNombre(data?.razon_social || ''));
  }, [empresaId]);

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
      ? 'Tu cuenta aún no tiene una empresa asignada. Escribe a tu consultor Russell Bedford para activarla.'
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
            <p className="text-sm text-muted-foreground">No hay vencimientos programados para este mes.</p>
            <Button variant="outline" size="sm" onClick={() => navigate(ctaPath)}>
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render de una fila de obligación (compartido entre lista flat y agrupada) ──
  const renderObligacionRow = (obl: Obligacion) => {
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
        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg transition-colors mb-1.5 ${
          isCompleted ? 'bg-success/5 border-success/20' : 'hover:bg-accent/10'
        }`}
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox
            checked={isCompleted}
            disabled={toggling === obl.id}
            onCheckedChange={() => {
              const oc = ocurrencias.find((o) => o.id === obl.id);
              if (oc) toggleCumplimiento(oc);
            }}
            aria-label={`Marcar ${obl.nombre} como cumplida`}
            className="shrink-0"
          />
          <div
            className="flex-1 min-w-0 cursor-pointer hover:underline decoration-muted-foreground/30"
            onClick={() => {
              setSelectedObId(obl.obligacion_id);
              setSelectedOcurrenciaId(obl.id);
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
                  {getPeriodLabel(obl.presentacion, ocurrencias.find((o) => o.id === obl.id)?.periodo_key ?? '')}
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
  };

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
        <div className="max-h-[320px] overflow-y-auto pr-1">
          {obligacionesOrdenadas.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">Todas las obligaciones están cumplidas 🎉</p>
          ) : obligacionesOrdenadas.length > 8 ? (
            <ObligacionesPorUrgencia
              items={obligacionesOrdenadas}
              getFecha={(obl) => obl.fecha_vencimiento}
              getKey={(obl) => obl.id}
              renderItem={renderObligacionRow}
            />
          ) : (
            <div className="space-y-1.5">
              {obligacionesOrdenadas.map(renderObligacionRow)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <ObligacionDetailSheet
      open={sheetOpen}
      onOpenChange={(o) => { setSheetOpen(o); if (!o) setSelectedOcurrenciaId(null); }}
      obligacionId={selectedObId}
      ocurrenciaId={selectedOcurrenciaId}
      onCumplimientoChange={refetchCumplimientos}
    />
    </>
  );
}
