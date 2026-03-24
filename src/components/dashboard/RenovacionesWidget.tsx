import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, addMonths } from 'date-fns';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

interface RenovacionAlerta {
  empresa: string;
  empresaId: string;
  programa: string;
  tipo: string;
  fechaRenovacion: Date;
  diasRestantes: number;
}

const PROGRAMA_LABELS: Record<string, string> = {
  certificacion: 'Cert. IVA/IEPS',
  matriz_seguridad: 'Matriz de Seguridad',
  prosec: 'PROSEC',
  immex: 'IMMEX',
};

const DEFAULT_DIAS_ANTES = 30;

export default function RenovacionesWidget() {
  const [alertas, setAlertas] = useState<RenovacionAlerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenovaciones();
  }, []);

  const fetchRenovaciones = async () => {
    setLoading(true);
    try {
      // Get configurable dias_antes per program type from reminder_rules
      const { data: rules } = await (supabase as any)
        .from('reminder_rules')
        .select('tipo, dias_antes')
        .eq('activa', true);

      const diasAntesByTipo: Record<string, number> = {};
      (rules || []).forEach((r: { tipo: string; dias_antes: number }) => {
        // Use the largest dias_antes if multiple rules exist for the same type
        if (!diasAntesByTipo[r.tipo] || r.dias_antes > diasAntesByTipo[r.tipo]) {
          diasAntesByTipo[r.tipo] = r.dias_antes;
        }
      });

      const getDias = (tipo: string) => diasAntesByTipo[tipo] ?? DEFAULT_DIAS_ANTES;

      // Fetch all empresas with program date fields
      const { data: empresas } = await supabase
        .from('empresas')
        .select(`
          id,
          razon_social,
          cert_iva_ieps_fecha_renovar,
          matriz_seguridad_fecha_renovar,
          prosec_fecha_siguiente_renovacion,
          immex_fecha_autorizacion,
          immex_periodo_renovacion_meses
        `)
        .order('razon_social');

      const now = new Date();
      const nuevasAlertas: RenovacionAlerta[] = [];

      for (const e of empresas || []) {
        const checks: { tipo: string; fecha: string | null }[] = [
          { tipo: 'certificacion', fecha: e.cert_iva_ieps_fecha_renovar },
          { tipo: 'matriz_seguridad', fecha: e.matriz_seguridad_fecha_renovar },
          { tipo: 'prosec', fecha: (e as any).prosec_fecha_siguiente_renovacion },
        ];

        // IMMEX: calculate next renewal from autorización date + period
        if (e.immex_fecha_autorizacion && (e as any).immex_periodo_renovacion_meses) {
          const autorizacion = new Date(e.immex_fecha_autorizacion + 'T12:00:00');
          const meses = (e as any).immex_periodo_renovacion_meses as number;
          // Find the next renewal after today
          let nextRenewal = new Date(autorizacion);
          while (nextRenewal <= now) {
            nextRenewal = addMonths(nextRenewal, meses);
          }
          checks.push({ tipo: 'immex', fecha: nextRenewal.toISOString().split('T')[0] });
        }

        for (const check of checks) {
          if (!check.fecha) continue;
          const fechaDate = new Date(check.fecha + 'T12:00:00');
          const dias = differenceInDays(fechaDate, now);
          if (dias >= 0 && dias <= getDias(check.tipo)) {
            nuevasAlertas.push({
              empresa: e.razon_social,
              empresaId: e.id,
              programa: PROGRAMA_LABELS[check.tipo] || check.tipo,
              tipo: check.tipo,
              fechaRenovacion: fechaDate,
              diasRestantes: dias,
            });
          }
        }
      }

      // Sort by urgency (fewest days first)
      nuevasAlertas.sort((a, b) => a.diasRestantes - b.diasRestantes);
      setAlertas(nuevasAlertas);
    } catch (err) {
      console.error('Error fetching renovaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyConfig = (dias: number) => {
    if (dias <= 7) return {
      className: 'border-l-destructive bg-destructive/5',
      badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
      Icon: ShieldAlert,
      label: `${dias}d`,
    };
    if (dias <= 30) return {
      className: 'border-l-amber-500 bg-amber-500/5',
      badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
      Icon: AlertTriangle,
      label: `${dias}d`,
    };
    return {
      className: 'border-l-warning bg-warning/5',
      badgeClass: 'bg-warning/10 text-warning border-warning/30',
      Icon: Clock,
      label: `${dias}d`,
    };
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Renovaciones de Programas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Renovaciones de Programas
          </CardTitle>
          {alertas.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {alertas.length} próxima{alertas.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground font-body">
          IMMEX · Cert. IVA/IEPS · PROSEC · Matriz de Seguridad
        </p>
      </CardHeader>
      <CardContent>
        {alertas.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-success">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">Todo al día — sin renovaciones próximas</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {alertas.map((alerta, idx) => {
              const cfg = getUrgencyConfig(alerta.diasRestantes);
              const Icon = cfg.Icon;
              return (
                <div
                  key={`${alerta.empresaId}-${alerta.tipo}-${idx}`}
                  className={`flex items-center justify-between p-3 rounded-lg border border-l-4 ${cfg.className}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{alerta.empresa}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alerta.programa}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-muted-foreground">
                      {alerta.fechaRenovacion.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <Badge variant="outline" className={`text-xs gap-1 ${cfg.badgeClass}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
