import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ClipboardList, Building2, Calendar, CheckCircle2, AlertCircle, Zap, RefreshCw } from 'lucide-react';
import {
  getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS, getVencimientoInfo, isRecurring,
} from '@/lib/obligaciones';
import { formatDateShort } from '@/lib/obligaciones';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useOcurrenciasCumplimientos } from '@/hooks/useOcurrenciasCumplimientos';
import { ObligacionesPorUrgencia } from './ObligacionesPorUrgencia';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { OcurrenciaConObligacion } from '@/types/domain';

/**
 * Fase 2 — vista de OCURRENCIAS reales.
 * Antes: 1 fila por obligación con "próximo período" calculado en runtime.
 * Ahora: lista las ocurrencias reales de `obligacion_ocurrencias`, cada una con
 * su vencimiento y estado de cumplimiento propio.
 */
export function ObligacionesActivasTab() {
  const { selectedEmpresaId } = useEmpresaContext();
  const empresaId = selectedEmpresaId && selectedEmpresaId !== 'all' ? selectedEmpresaId : null;
  const { ocurrencias, cumplimientos, toggleCumplimiento, loading } = useOcurrenciasCumplimientos(empresaId);
  const [showCompletadas, setShowCompletadas] = useState(false);

  const { pendientes, completadas } = useMemo(() => {
    const p: OcurrenciaConObligacion[] = [];
    const c: OcurrenciaConObligacion[] = [];
    for (const oc of ocurrencias) {
      (cumplimientos[oc.id] ? c : p).push(oc);
    }
    return { pendientes: p, completadas: c };
  }, [ocurrencias, cumplimientos]);

  if (!empresaId) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-2">Selecciona una empresa</h3>
        <p className="text-sm text-muted-foreground font-body">
          Elige una empresa para ver sus obligaciones y vencimientos.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (ocurrencias.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <ClipboardList className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-2">Sin obligaciones activas</h3>
        <p className="text-sm text-muted-foreground font-body">
          Las obligaciones activadas generan sus vencimientos aquí.
        </p>
      </div>
    );
  }

  const renderOcurrencia = (oc: OcurrenciaConObligacion) => {
    const obl = oc.obligaciones;
    const isCompleted = !!cumplimientos[oc.id];
    const recurring = isRecurring(obl?.presentacion ?? null);
    const vInfo = getVencimientoInfo(oc.fecha_vencimiento);

    return (
      <div
        key={oc.id}
        className={`group relative p-4 border rounded-lg transition-all bg-card hover:shadow-md ${isCompleted ? 'bg-success/5 border-success/30' : ''}`}
        style={{
          borderLeft: `3px solid ${
            vInfo?.status === 'vencido' ? 'hsl(var(--destructive))' :
            vInfo?.status === 'urgente' ? 'hsl(var(--urgent))' :
            vInfo?.status === 'proximo' ? 'hsl(var(--warning))' :
            'hsl(var(--success))'
          }`,
        }}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={() => toggleCumplimiento(oc)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`font-heading font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {obl?.nombre ?? 'Obligación'}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                {recurring && obl?.presentacion && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <RefreshCw className="w-3 h-3" />
                    {obl.presentacion}
                  </Badge>
                )}
                {obl?.categoria && (
                  <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[obl.categoria] || ''}`}>
                    {CATEGORIA_LABELS[obl.categoria] || obl.categoria}
                  </Badge>
                )}
              </div>
            </div>
            {obl?.descripcion && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{obl.descripcion}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {obl?.empresas?.razon_social && (
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{obl.empresas.razon_social}</span>
              )}
              {obl?.presentacion && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {getPeriodLabel(obl.presentacion, oc.periodo_key)}
                </span>
              )}
              <span className={`flex items-center gap-1 font-medium ${vInfo?.status === 'vencido' || vInfo?.status === 'urgente' ? 'text-destructive' : ''}`}>
                {recurring ? 'Vence:' : 'Vence:'} {formatDateShort(oc.fecha_vencimiento)}
              </span>
            </div>
          </div>
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-1" />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="secondary" className="gap-1">
          <Zap className="w-3 h-3" /> {ocurrencias.length} vencimientos
        </Badge>
        <Badge className="bg-success/20 text-success border-success/30 gap-1">
          <CheckCircle2 className="w-3 h-3" /> {completadas.length} completados
        </Badge>
        <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
          <AlertCircle className="w-3 h-3" /> {pendientes.length} pendientes
        </Badge>
      </div>

      {/* Pendientes agrupadas por urgencia (vencidas/urgentes abiertas por defecto) */}
      <ObligacionesPorUrgencia
        items={pendientes}
        getFecha={(oc) => oc.fecha_vencimiento}
        getKey={(oc) => oc.id}
        renderItem={renderOcurrencia}
      />

      {/* Completadas: colapsadas detrás de un toggle */}
      {completadas.length > 0 && (
        <Collapsible open={showCompletadas} onOpenChange={setShowCompletadas}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-1 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="font-heading">Ver completadas</span>
              <span className="font-normal">({completadas.length})</span>
              <ChevronDown className={cn('w-4 h-4 ml-auto transition-transform', showCompletadas && 'rotate-180')} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-1">
            {completadas.map(renderOcurrencia)}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
