import { useEffect, useState } from 'react';
import { format, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  getCurrentPeriodKey, formatDateShort, getVencimientoInfo,
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

interface Obligacion {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string | null;
  fecha_vencimiento: string | null;
}

export default function DashboardObligacionesMensuales() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresaContext();

  const [empresaId, setEmpresaId]         = useState<string | null>(null);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [obligaciones, setObligaciones]   = useState<Obligacion[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading]             = useState(true);
  const [toggling, setToggling]           = useState<string | null>(null);

  // --- resolve empresaId + nombre empresa ---
  useEffect(() => {
    if (!user) return;
    if (role === 'cliente') {
      resolveClienteEmpresa();
    } else {
      const id = selectedEmpresaId && selectedEmpresaId !== 'all'
        ? selectedEmpresaId : null;
      setEmpresaId(id);
      if (!id) { setEmpresaNombre(''); setObligaciones([]); setCumplimientos({}); setLoading(false); }
    }
  }, [user, role, selectedEmpresaId]);

  const resolveClienteEmpresa = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user!.id)
      .maybeSingle();
    setEmpresaId(data?.empresa_id ?? null);
    if (!data?.empresa_id) setLoading(false);
  };

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
    await fetchCumplimientos(obls);
    setLoading(false);
  };

  const fetchCumplimientos = async (obls: Obligacion[]) => {
    if (obls.length === 0) { setCumplimientos({}); return; }
    const oblIds = obls.map(o => o.id);
    const { data: cumpData } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key, completada')
      .in('obligacion_id', oblIds);

    const map: Record<string, boolean> = {};
    (cumpData || []).forEach((c: any) => {
      const obl = obls.find(o => o.id === c.obligacion_id);
      if (obl && c.periodo_key === getCurrentPeriodKey(obl.presentacion)) {
        map[c.obligacion_id] = c.completada;
      }
    });
    setCumplimientos(map);
  };

  return <div />;
}
