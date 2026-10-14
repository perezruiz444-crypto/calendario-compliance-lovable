import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ObligacionFormDialog } from '@/components/obligaciones/ObligacionFormDialog';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  getCurrentPeriodKey, getPeriodLabel,
  formatDateShort, getVencimientoInfo, ocurrenciasCumplidas, estadoPorOcurrencias, guardarCumplimiento,
  type OcurrenciaRef } from '@/lib/obligaciones';
import {
  FileText, Pencil, CheckCircle2, Clock, AlertTriangle, ShieldAlert,
  ToggleLeft, ToggleRight, Loader2, ChevronDown,
} from 'lucide-react';

interface Props {
  empresaId: string;
  canEdit: boolean;
  refreshTrigger?: number;
}

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  articulos: string | null;
  fecha_vencimiento: string | null;
  activa: boolean;
  estado: string;
  descripcion: string | null;
  notas: string | null;
  numero_oficio: string | null;
  fecha_autorizacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_renovacion: string | null;
  responsable_id: string | null;
  responsable_tipo: string | null;
}

export function EmpresaObligacionesActivasCard({ empresaId, canEdit, refreshTrigger }: Props) {
  const { user } = useAuth();
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [editObl, setEditObl] = useState<Obligacion | null>(null);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState<string | null>(null);
  // Ocurrencia del periodo en curso por obligación_id (cada periodo es independiente).
  const [proximaOcurrencia, setProximaOcurrencia] = useState<Record<string, OcurrenciaRef>>({});
  const [atrasadas, setAtrasadas] = useState<Record<string, number>>({});
  const [ocurrenciasPorObl, setOcurrenciasPorObl] = useState<Record<string, OcurrenciaRef[]>>({});
  const [expandida, setExpandida] = useState<string | null>(null);
  // Selección múltiple de periodos pendientes dentro de la obligación expandida
  const [seleccionando, setSeleccionando] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [guardandoLote, setGuardandoLote] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: oblData } = await supabase
        .from('obligaciones')
        .select('id, nombre, categoria, presentacion, articulos, fecha_vencimiento, activa, estado, descripcion, notas, numero_oficio, fecha_autorizacion, fecha_inicio, fecha_fin, fecha_renovacion, responsable_id, responsable_tipo')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .order('categoria')
        .order('nombre');

      const obls = (oblData || []) as Obligacion[];
      setObligaciones(obls);

      // Ocurrencias + cumplimientos vigentes de estas obligaciones.
      const obIds = obls.map((o) => o.id);
      if (obIds.length > 0) {
        const { data: ocData } = await supabase
          .from('obligacion_ocurrencias')
          .select('id, obligacion_id, periodo_key, fecha_vencimiento')
          .in('obligacion_id', obIds)
          .order('fecha_vencimiento', { ascending: true });
        const ocs = ocData || [];
        const ocIds = ocs.map((o) => o.id);
        let cumplidas = new Set<string>();
        if (ocIds.length > 0) {
          const { data: cData } = await supabase
            .from('obligacion_cumplimientos')
            .select('ocurrencia_id, completada, vigente')
            .in('ocurrencia_id', ocIds);
          cumplidas = ocurrenciasCumplidas(cData);
        }
        const cMap: Record<string, boolean> = {};
        const porObl: Record<string, OcurrenciaRef[]> = {};
        ocs.forEach((oc) => {
          cMap[oc.id] = cumplidas.has(oc.id);
          (porObl[oc.obligacion_id] ||= []).push(oc);
        });
        const proxMap: Record<string, OcurrenciaRef> = {};
        const atrasMap: Record<string, number> = {};
        estadoPorOcurrencias(ocs, cumplidas).forEach((e, oblId) => {
          proxMap[oblId] = e.actual;
          atrasMap[oblId] = e.atrasadas;
        });
        setCumplimientos(cMap);
        setProximaOcurrencia(proxMap);
        setAtrasadas(atrasMap);
        setOcurrenciasPorObl(porObl);
      } else {
        setCumplimientos({});
        setProximaOcurrencia({});
        setAtrasadas({});
        setOcurrenciasPorObl({});
      }
    } catch {
      toast.error('Error al cargar obligaciones');
    } finally {
      setLoading(false);
    }
  };

  // Toggle append-only sobre la ocurrencia del periodo en curso.
  const toggleCumplimiento = async (obl: Obligacion) => {
    const oc = proximaOcurrencia[obl.id];
    if (!oc) { toast.error('Esta obligación no tiene ocurrencias para cumplir'); return; }
    await toggleOcurrencia(oc);
  };

  // Toggle append-only de una ocurrencia concreta (cada periodo es independiente).
  const toggleOcurrencia = async (oc: OcurrenciaRef) => {
    if (!user) return;
    const isCompleted = cumplimientos[oc.id];
    setToggling(oc.id);
    try {
      const { error } = await guardarCumplimiento(supabase, {
        ocurrencia: oc, empresaId, userId: user.id, completada: !isCompleted,
      });
      if (error) throw error;
      setCumplimientos((prev) => ({ ...prev, [oc.id]: !isCompleted }));
      toast.success(isCompleted ? 'Cumplimiento desmarcado' : 'Cumplimiento marcado');
      // Recalcula ocurrencia actual y atrasadas
      fetchData();
    } catch {
      toast.error('No tienes permiso o hubo un error');
    } finally {
      setToggling(null);
    }
  };

  const salirSeleccion = () => { setSeleccionando(false); setSeleccion(new Set()); };

  const alternarSeleccion = (ocId: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(ocId)) next.delete(ocId); else next.add(ocId);
      return next;
    });
  };

  // Marca como cumplidos todos los periodos seleccionados
  const marcarSeleccionadas = async (ocs: OcurrenciaRef[]) => {
    if (!user) return;
    const elegidas = ocs.filter((o) => seleccion.has(o.id) && !cumplimientos[o.id]);
    if (elegidas.length === 0) return;
    setGuardandoLote(true);
    let fallidas = 0;
    for (const oc of elegidas) {
      const { error } = await guardarCumplimiento(supabase, {
        ocurrencia: oc, empresaId, userId: user.id, completada: true,
      });
      if (error) fallidas++;
    }
    setGuardandoLote(false);
    const ok = elegidas.length - fallidas;
    if (ok > 0) toast.success(`${ok} periodo(s) marcado(s) como cumplido(s)`);
    if (fallidas > 0) toast.error(`${fallidas} periodo(s) no se pudieron marcar`);
    salirSeleccion();
    fetchData();
  };

  useEffect(() => { fetchData(); }, [empresaId, refreshTrigger]);

  const toggleActiva = async (obl: Obligacion) => {
    setDeactivating(obl.id);
    try {
      await supabase
        .from('obligaciones')
        .update({ activa: false })
        .eq('id', obl.id);
      toast.success('Obligación desactivada');
      fetchData();
    } catch {
      toast.error('Error al desactivar');
    } finally {
      setDeactivating(null);
    }
  };

  const getStatusBadge = (obl: Obligacion) => {
    // Sin ocurrencias = eventual: no tiene periodo ni vencimiento
    if (!proximaOcurrencia[obl.id]) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">Eventual</Badge>
      );
    }
    // Periodo en curso ya cumplido: no mostrar "Vencido"
    if (cumplimientos[proximaOcurrencia[obl.id].id]) {
      return (
        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />Cumplida
        </Badge>
      );
    }
    const fecha = proximaOcurrencia[obl.id]?.fecha_vencimiento ?? obl.fecha_vencimiento;
    const info = getVencimientoInfo(fecha);
    if (!info) return null;
    const config = {
      vencido: { label: 'Vencido', className: 'bg-destructive/10 text-destructive border-destructive/30', icon: ShieldAlert },
      urgente: { label: `${info.days}d`, className: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertTriangle },
      proximo: { label: `${info.days}d`, className: 'bg-warning/10 text-warning border-warning/30', icon: Clock },
      vigente: { label: 'Vigente', className: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
    }[info.status];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`text-xs ${config.className}`}>
        <Icon className="w-3 h-3 mr-1" />{config.label}
      </Badge>
    );
  };

  // Por obligación, según su periodo en curso (no por ocurrencias sueltas)
  const completadas = obligaciones.filter((o) => {
    const oc = proximaOcurrencia[o.id];
    return oc ? !!cumplimientos[oc.id] : false;
  }).length;
  // Las eventuales (sin ocurrencias) no cuentan como pendientes
  const pendientes = obligaciones.filter((o) => proximaOcurrencia[o.id]).length - completadas;

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <FileText className="w-5 h-5" />Obligaciones Activas
            </CardTitle>
            <CardDescription>
              {obligaciones.length} activa(s) · {completadas} cumplida(s) · {pendientes} pendiente(s)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />{completadas}
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              <Clock className="w-3 h-3 mr-1" />{pendientes}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {obligaciones.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {obligaciones.map((obl) => {
                const oc = proximaOcurrencia[obl.id];
                const isCompleted = oc ? (cumplimientos[oc.id] || false) : false;
                const periodKey = oc?.periodo_key ?? getCurrentPeriodKey(obl.presentacion);
                const periodLabel = getPeriodLabel(obl.presentacion, periodKey);
                const fechaVenc = oc?.fecha_vencimiento ?? obl.fecha_vencimiento;

                const nAtrasadas = atrasadas[obl.id] ?? 0;
                const ocsObl = ocurrenciasPorObl[obl.id] ?? [];

                return (
                  <div key={obl.id}>
                  <div
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isCompleted ? 'bg-success/5 border-success/20' : 'hover:bg-accent/10'
                    }`}
                  >
                    {/* Checkbox (las eventuales no se marcan) */}
                    {canEdit && proximaOcurrencia[obl.id] && (
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleCumplimiento(obl)}
                        className="shrink-0"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {obl.nombre}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge className={`text-xs ${CATEGORIA_COLORS[obl.categoria] || CATEGORIA_COLORS.otro}`}>
                          {CATEGORIA_LABELS[obl.categoria] || obl.categoria}
                        </Badge>
                        {obl.presentacion && (
                          <span className="text-xs text-muted-foreground">{obl.presentacion} · {periodLabel}</span>
                        )}
                        {fechaVenc && (
                          <span className="text-xs text-muted-foreground">Vence: {formatDateShort(fechaVenc)}</span>
                        )}
                        {nAtrasadas > 0 && (
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                            {nAtrasadas} periodo(s) atrasado(s)
                          </Badge>
                        )}
                      </div>
                    </div>

                    {ocsObl.length > 1 && (
                      <Button
                        aria-label="Ver periodos"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => { setExpandida(expandida === obl.id ? null : obl.id); salirSeleccion(); }}
                        title="Ver todos los periodos"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandida === obl.id ? 'rotate-180' : ''}`} />
                      </Button>
                    )}

                    {/* Status */}
                    {getStatusBadge(obl)}

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          aria-label="Editar obligación"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditObl(obl)}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          aria-label="Desactivar obligación"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => toggleActiva(obl)}
                      disabled={deactivating === obl.id}
                          title="Desactivar"
                        >
                      {deactivating === obl.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ToggleRight className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {expandida === obl.id && (() => {
                    const hoyStr = new Date().toISOString().slice(0, 10);
                    const pendientesObl = ocsObl.filter((o) => !cumplimientos[o.id]);
                    const atrasadasObl = pendientesObl.filter((o) => o.fecha_vencimiento < hoyStr);
                    const nSel = ocsObl.filter((o) => seleccion.has(o.id)).length;
                    return (
                    <div className="mt-1 mb-2 ml-3 space-y-2">
                      {canEdit && pendientesObl.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {seleccionando ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={nSel === 0 || guardandoLote}
                                onClick={() => marcarSeleccionadas(ocsObl)}
                              >
                                {guardandoLote
                                  ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                Marcar {nSel} como cumplida(s)
                              </Button>
                              {atrasadasObl.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={guardandoLote}
                                  onClick={() => setSeleccion(new Set(atrasadasObl.map((o) => o.id)))}
                                >
                                  Seleccionar atrasadas ({atrasadasObl.length})
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={guardandoLote}
                                onClick={salirSeleccion}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setSeleccionando(true)}
                            >
                              Seleccionar varios
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ocsObl.map((o) => {
                        const hecha = !!cumplimientos[o.id];
                        const vencida = !hecha && getVencimientoInfo(o.fecha_vencimiento)?.status === 'vencido';
                        const elegida = seleccion.has(o.id);
                        return (
                          <label
                            key={o.id}
                            className={`flex items-center gap-2 px-2 py-1.5 border rounded-md text-xs ${
                              elegida ? 'bg-primary/10 border-primary/40'
                                : hecha ? 'bg-success/5 border-success/20' : vencida ? 'border-destructive/30 text-destructive' : ''
                            }`}
                          >
                            {seleccionando ? (
                              <Checkbox
                                checked={hecha || elegida}
                                disabled={hecha || guardandoLote}
                                onCheckedChange={() => alternarSeleccion(o.id)}
                              />
                            ) : (
                              <Checkbox
                                checked={hecha}
                                disabled={!canEdit || toggling === o.id}
                                onCheckedChange={() => toggleOcurrencia(o)}
                              />
                            )}
                            {getPeriodLabel(obl.presentacion, o.periodo_key)}
                          </label>
                        );
                      })}
                      </div>
                    </div>
                    );
                  })()}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Sin obligaciones activas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {editObl && (
        <ObligacionFormDialog
          open={!!editObl}
          onOpenChange={(open) => { if (!open) { setEditObl(null); fetchData(); } }}
          empresaId={empresaId}
          initialData={{
            id: editObl.id,
            nombre: editObl.nombre,
            categoria: editObl.categoria,
            presentacion: editObl.presentacion || '',
            articulos: editObl.articulos || '',
            descripcion: editObl.descripcion || '',
            estado: editObl.estado,
            activa: editObl.activa,
            fecha_vencimiento: editObl.fecha_vencimiento || '',
            fecha_autorizacion: editObl.fecha_autorizacion || '',
            fecha_inicio: editObl.fecha_inicio || '',
            fecha_fin: editObl.fecha_fin || '',
            fecha_renovacion: editObl.fecha_renovacion || '',
            notas: editObl.notas || '',
            numero_oficio: editObl.numero_oficio || '',
            responsable_id: editObl.responsable_id || '',
            responsable_tipo: editObl.responsable_tipo || '',
            responsable_ids: [],
          }}
          onSubmit={async (data) => {
            const { error } = await supabase.from('obligaciones').update({
              categoria: data.categoria,
              nombre: data.nombre,
              descripcion: data.descripcion || null,
              articulos: data.articulos || null,
              presentacion: data.presentacion || null,
              fecha_autorizacion: data.fecha_autorizacion || null,
              fecha_vencimiento: data.fecha_vencimiento || null,
              fecha_renovacion: data.fecha_renovacion || null,
              fecha_inicio: data.fecha_inicio || null,
              fecha_fin: data.fecha_fin || null,
              numero_oficio: data.numero_oficio || null,
              estado: data.estado,
              notas: data.notas || null,
              activa: data.activa || !!data.fecha_vencimiento || !!data.fecha_inicio || !!data.fecha_fin,
              responsable_tipo: data.responsable_tipo || null,
              responsable_id: data.responsable_id || null,
            }).eq('id', editObl.id);
            if (error) { toast.error('Error al actualizar'); return; }
            toast.success('Obligación actualizada');
            setEditObl(null);
            fetchData();
          }}
        />
      )}
    </>
  );
}
