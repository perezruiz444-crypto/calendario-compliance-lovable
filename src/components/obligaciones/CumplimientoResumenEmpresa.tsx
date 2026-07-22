import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS } from '@/lib/obligaciones';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import type { OcurrenciaConObligacion } from '@/types/domain';

interface Props { empresaId: string; }

/**
 * Fase 2 — matriz obligación × período alimentada por OCURRENCIAS reales.
 * Antes: generaba 6 períodos mensuales sintéticos y hacía matching heurístico.
 * Ahora: lee las ocurrencias reales y su cumplimiento vigente; las columnas son
 * los períodos que realmente existen.
 */
export function CumplimientoResumenEmpresa({ empresaId }: Props) {
  const [ocurrencias, setOcurrencias] = useState<OcurrenciaConObligacion[]>([]);
  const [cumplidas, setCumplidas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: ocData, error } = await supabase
        .from('obligacion_ocurrencias')
        .select('*, obligaciones(id, nombre, categoria, presentacion)')
        .eq('empresa_id', empresaId)
        .order('fecha_vencimiento', { ascending: true });

      if (error) { logger.error('Error al cargar ocurrencias (resumen)', error); if (active) setLoading(false); return; }
      const ocs = (ocData || []) as unknown as OcurrenciaConObligacion[];

      let done = new Set<string>();
      if (ocs.length > 0) {
        const { data: cData } = await supabase
          .from('obligacion_cumplimientos')
          .select('ocurrencia_id, completada, vigente')
          .eq('empresa_id', empresaId)
          .in('ocurrencia_id', ocs.map(o => o.id));
        done = new Set((cData || []).filter((c: any) => c.vigente && c.completada && c.ocurrencia_id).map((c: any) => c.ocurrencia_id));
      }

      if (active) { setOcurrencias(ocs); setCumplidas(done); setLoading(false); }
    })();
    return () => { active = false; };
  }, [empresaId]);

  // Columnas = períodos presentes (ordenados). Filas = obligaciones.
  const { periodos, filas } = useMemo(() => {
    const periodSet = new Set<string>();
    const byObl = new Map<string, { id: string; nombre: string; categoria: string; presentacion: string | null; cells: Map<string, boolean> }>();

    for (const oc of ocurrencias) {
      periodSet.add(oc.periodo_key);
      const obl = oc.obligaciones;
      if (!obl) continue;
      if (!byObl.has(obl.id)) {
        byObl.set(obl.id, { id: obl.id, nombre: obl.nombre, categoria: obl.categoria, presentacion: obl.presentacion ?? null, cells: new Map() });
      }
      byObl.get(obl.id)!.cells.set(oc.periodo_key, cumplidas.has(oc.id));
    }

    const periodos = Array.from(periodSet).sort();
    const filas = Array.from(byObl.values()).sort((a, b) => a.categoria.localeCompare(b.categoria));
    return { periodos, filas };
  }, [ocurrencias, cumplidas]);

  if (loading) return <div className="animate-pulse h-20 bg-muted rounded-lg" />;
  if (filas.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Sin obligaciones activas</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-2 font-medium text-muted-foreground w-64">Obligación</th>
            {periodos.map(p => (
              <th key={p} className="text-center p-2 font-medium text-muted-foreground text-xs whitespace-nowrap">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(ob => (
            <tr key={ob.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                    {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                  </Badge>
                  <span className="truncate max-w-[160px] text-xs font-medium">{ob.nombre}</span>
                </div>
              </td>
              {periodos.map(p => {
                const has = ob.cells.has(p);
                const cumplida = ob.cells.get(p);
                return (
                  <td key={p} className="p-2 text-center">
                    {!has
                      ? <span className="text-muted-foreground/20">·</span>
                      : cumplida
                        ? <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                        : <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    }
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
