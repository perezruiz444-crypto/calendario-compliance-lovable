/**
 * EmpresaComplianceSemaforo
 * Vista rápida del estado de cumplimiento por empresa.
 * Se muestra en el Dashboard debajo de DashboardObligaciones.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentPeriodKey, getVencimientoInfo } from '@/lib/obligaciones';
import { Building2, ChevronRight } from 'lucide-react';
import { differenceInDays, isPast, isValid } from 'date-fns';

type SemaforoLevel = 'rojo' | 'amarillo' | 'verde';

interface EmpresaStats {
  id: string;
  razon_social: string;
  programas: string[];
  total: number;
  pendientes: number;
  vencidas: number;
  nivel: SemaforoLevel;
  pct: number;
}

function semaforoColor(nivel: SemaforoLevel) {
  if (nivel === 'rojo')    return 'bg-destructive';
  if (nivel === 'amarillo') return 'bg-warning';
  return 'bg-success';
}

function progressColor(nivel: SemaforoLevel) {
  if (nivel === 'rojo')    return 'bg-destructive';
  if (nivel === 'amarillo') return 'bg-warning';
  return 'bg-success';
}

export default function EmpresaComplianceSemaforo() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();
  const [empresas, setEmpresas] = useState<EmpresaStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [selectedEmpresaId]);

  const fetchData = async () => {
    setLoading(true);

    // 1. Traer empresas visibles al usuario
  let empQuery = supabase
      .from('empresas')
      .select('id, razon_social, immex_numero, prosec_numero, padron_general_numero')
      .order('razon_social');

    if (selectedEmpresaId && selectedEmpresaId !== 'all') {
      empQuery = empQuery.eq('id', selectedEmpresaId);
    }

    const { data: empData } = await empQuery;

    if (!empData || empData.length === 0) { setLoading(false); return; }

    // 2. Traer obligaciones activas de esas empresas
    const empIds = empData.map(e => e.id);
    const { data: obsData } = await supabase
      .from('obligaciones')
      .select('id, empresa_id, nombre, presentacion, fecha_vencimiento, categoria')
      .eq('activa', true)
      .in('empresa_id', empIds);

    const obs = obsData || [];

    // 3. Traer cumplimientos
    const obsIds = obs.map(o => o.id);
    let cumplMap: Record<string, boolean> = {};
    if (obsIds.length > 0) {
      const { data: cumplData } = await supabase
        .from('obligacion_cumplimientos')
        .select('obligacion_id, periodo_key')
        .in('obligacion_id', obsIds);
      (cumplData || []).forEach(c => {
        cumplMap[`${c.obligacion_id}:${c.periodo_key}`] = true;
      });
    }

    // 4. Calcular stats por empresa
    const stats: EmpresaStats[] = empData.map(emp => {
      const empObs = obs.filter(o => o.empresa_id === emp.id);
      let pendientes = 0;
      let vencidas = 0;

      empObs.forEach(ob => {
        const pk = getCurrentPeriodKey(ob.presentacion);
        const isCumplida = !!cumplMap[`${ob.id}:${pk}`];
        if (isCumplida) return;

        if (ob.fecha_vencimiento) {
          const d = new Date(ob.fecha_vencimiento);
          if (isValid(d) && isPast(d)) { vencidas++; pendientes++; return; }
        }
        pendientes++;
      });

      const total = empObs.length;
      const cumplidas = total - pendientes;
      const pct = total === 0 ? 100 : Math.round((cumplidas / total) * 100);

      const nivel: SemaforoLevel =
        vencidas > 0         ? 'rojo' :
        pendientes > 0       ? 'amarillo' :
        'verde';

      // Programas activos
      const programas: string[] = [];
      if (emp.immex_numero)        programas.push('IMMEX');
      if (emp.prosec_numero)        programas.push('PROSEC');
      if (emp.padron_general_numero) programas.push('Padrón');

      return { id: emp.id, razon_social: emp.razon_social, programas, total, pendientes, vencidas, nivel, pct };
    });

    // Ordenar: rojo primero, luego amarillo, luego verde
    stats.sort((a, b) => {
      const order = { rojo: 0, amarillo: 1, verde: 2 };
      return order[a.nivel] - order[b.nivel];
    });

    setEmpresas(stats.filter(e => e.total > 0)); // solo las que tienen obligaciones
    setLoading(false);
  };

  if (loading || empresas.length === 0) return null;

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4 text-primary" />
          Semáforo de Cumplimiento por Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {empresas.map(e => (
            <button
              key={e.id}
              onClick={() => navigate(`/empresas/${e.id}`)}
              className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors group"
            >
              {/* Semáforo dot */}
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${semaforoColor(e.nivel)}`} />

              {/* Empresa info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{e.razon_social}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {e.programas.map(p => (
                    <span key={p} className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  {e.vencidas > 0 && (
                    <p className="text-xs text-destructive font-semibold">{e.vencidas} vencida{e.vencidas > 1 ? 's' : ''}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {e.total - e.pendientes}/{e.total} cumplidas
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden hidden md:block">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(e.nivel)}`}
                    style={{ width: `${e.pct}%` }}
                  />
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
