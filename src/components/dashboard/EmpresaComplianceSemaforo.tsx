import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { useNavigate } from 'react-router-dom';
import { getCurrentPeriodKey } from '@/lib/obligaciones';
import { Building2, ChevronRight } from 'lucide-react';
import { isPast, isValid } from 'date-fns';

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
  if (nivel === 'rojo')     return 'bg-destructive';
  if (nivel === 'amarillo') return 'bg-warning';
  return 'bg-success';
}

function progressColor(nivel: SemaforoLevel) {
  if (nivel === 'rojo')     return 'bg-destructive';
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

    let empQuery = supabase
      .from('empresas')
      .select('id, razon_social, immex_numero, prosec_numero, padron_general_numero')
      .order('razon_social');

    if (selectedEmpresaId && selectedEmpresaId !== 'all') {
      empQuery = empQuery.eq('id', selectedEmpresaId);
    }

    const { data: empData } = await empQuery;

    if (!empData || empData.length === 0) { setLoading(false); return; }

    const empIds = empData.map(e => e.id);
    const { data: obsData } = await supabase
      .from('obligaciones')
      .select('id, empresa_id, presentacion, fecha_vencimiento')
      .eq('activa', true)
      .in('empresa_id', empIds);

    const obs = obsData || [];
    const obsIds = obs.map(o => o.id);
    const cumplMap: Record<string, boolean> = {};

    if (obsIds.length > 0) {
      const { data: cumplData } = await supabase
        .from('obligacion_cumplimientos')
        .select('obligacion_id, periodo_key')
        .in('obligacion_id', obsIds);
      (cumplData || []).forEach(c => {
        cumplMap[`${c.obligacion_id}:${c.periodo_key}`] = true;
      });
    }

    const stats: EmpresaStats[] = empData.map(emp => {
      const empObs = obs.filter(o => o.empresa_id === emp.id);
      let pendientes = 0;
      let vencidas = 0;

      empObs.forEach(ob => {
        const pk = getCurrentPeriodKey(ob.presentacion);
        if (cumplMap[`${ob.id}:${pk}`]) return;
        pendientes++;
        if (ob.fecha_vencimiento) {
          const d = new Date(ob.fecha_vencimiento);
          if (isValid(d) && isPast(d)) vencidas++;
        }
      });

      const total = empObs.length;
      const pct = total === 0 ? 100 : Math.round(((total - pendientes) / total) * 100);
      const nivel: SemaforoLevel = vencidas > 0 ? 'rojo' : pendientes > 0 ? 'amarillo' : 'verde';

      const programas: string[] = [];
      if (emp.immex_numero)         programas.push('IMMEX');
      if (emp.prosec_numero)        programas.push('PROSEC');
      if (emp.padron_general_numero) programas.push('Padrón');

      return { id: emp.id, razon_social: emp.razon_social, programas, total, pendientes, vencidas, nivel, pct };
    });

    stats.sort((a, b) => ({ rojo: 0, amarillo: 1, verde: 2 }[a.nivel] - { rojo: 0, amarillo: 1, verde: 2 }[b.nivel]));
    setEmpresas(stats.filter(e => e.total > 0));
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
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${semaforoColor(e.nivel)}`} />
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
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  {e.vencidas > 0 && (
                    <p className="text-xs text-destructive font-semibold">{e.vencidas} vencida{e.vencidas > 1 ? 's' : ''}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{e.total - e.pendientes}/{e.total} cumplidas</p>
                </div>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden hidden md:block">
                  <div className={`h-full rounded-full transition-all ${progressColor(e.nivel)}`} style={{ width: `${e.pct}%` }} />
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
