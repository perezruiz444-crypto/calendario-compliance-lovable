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
  formatDateShort, getVencimientoInfo,
} from '@/lib/obligaciones';
import {
  FileText, Pencil, CheckCircle2, Clock, AlertTriangle, ShieldAlert,
  ToggleLeft, ToggleRight, Loader2,
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
  // Fase 2: próxima ocurrencia pendiente por obligación_id.
  const [proximaOcurrencia, setProximaOcurrencia] = useState<Record<string, { id: string; periodo_key: string; fecha_vencimiento: string }>>({});

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
        const ocIds = ocs.map((o: any) => o.id);
        let cumplidas = new Set<string>();
        if (ocIds.length > 0) {
          const { data: cData } = await supabase
            .from('obligacion_cumplimientos')
            .select('ocurrencia_id, completada, vigente')
            .in('ocurrencia_id', ocIds);
          cumplidas = new Set((cData || []).filter((c: any) => c.vigente && c.completada && c.ocurrencia_id).map((c: any) => c.ocurrencia_id));
        }
        const cMap: Record<string, boolean> = {};
        const proxMap: Record<string, { id: string; periodo_key: string; fecha_vencimiento: string }> = {};
        ocs.forEach((oc: any) => {
          cMap[oc.id] = cumplidas.has(oc.id);
          if (!proxMap[oc.obligacion_id]) {
            proxMap[oc.obligacion_id] = { id: oc.id, periodo_key: oc.periodo_key, fecha_vencimiento: oc.fecha_vencimiento };
          } else if (!cumplidas.has(oc.id) && cumplidas.has(proxMap[oc.obligacion_id].id)) {
            proxMap[oc.obligacion_id] = { id: oc.id, periodo_key: oc.periodo_key, fecha_vencimiento: oc.fecha_vencimiento };
          }
        });
        setCumplimientos(cMap);
        setProximaOcurrencia(proxMap);
      } else {
        setCumplimientos({});
        setProximaOcurrencia({});
      }
    } catch {
      toast.error('Error al cargar obligaciones');
    } finally {
      setLoading(false);
    }
  };

  // Toggle append-only sobre la próxima ocurrencia de la obligación.
  const toggleCumplimiento = async (obl: Obligacion) => {
    if (!user) return;
    const oc = proximaOcurrencia[obl.id];
    if (!oc) { toast.error('Esta obligación no tiene ocurrencias para cumplir'); return; }
    const isCompleted = cumplimientos[oc.id];
    setToggling(obl.id);
    try {
      if (isCompleted) {
        const { data: existing } = await supabase
          .from('obligacion_cumplimientos')
          .select('id')
          .eq('ocurrencia_id', oc.id)
          .eq('vigente', true)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await supabase.rpc('corregir_cumplimiento', {
            p_cumplimiento_id: existing.id, p_completada: false, p_notas: null,
          });
          if (error) throw error;
        }
        setCumplimientos((prev) => ({ ...prev, [oc.id]: false }));
        toast.success('Cumplimiento desmarcado');
      } else {
        const { error } = await supabase.from('obligacion_cumplimientos').insert({
          obligacion_id: obl.id,
          ocurrencia_id: oc.id,
          empresa_id: empresaId,
          periodo_key: oc.periodo_key,
          completada: true,
          completada_por: user.id,
        });
        if (error) throw error;
        setCumplimientos((prev) => ({ ...prev, [oc.id]: true }));
        toast.success('Cumplimiento marcado');
      }
    } catch {
      toast.error('No tienes permiso o hubo un error');
    } finally {
      setToggling(null);
    }
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

  const completadas = Object.values(cumplimientos).filter(Boolean).length;
  const pendientes = obligaciones.length - completadas;

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

                return (
                  <div
                    key={obl.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isCompleted ? 'bg-success/5 border-success/20' : 'hover:bg-accent/10'
                    }`}
                  >
                    {/* Checkbox */}
                    {canEdit && (
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
                      </div>
                    </div>

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
