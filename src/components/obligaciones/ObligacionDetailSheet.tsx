import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertCircle, Clock, Calendar, Building2,
  FileText, User, RefreshCw, ExternalLink, RotateCcw,
} from 'lucide-react';
import {
  getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS,
  getVencimientoInfo, formatDateShort,
} from '@/lib/obligaciones';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligacionId: string | null;
  /** Fase 2: si viene, el sheet opera sobre ESTA ocurrencia concreta (calendario). */
  ocurrenciaId?: string | null;
  onCumplimientoChange?: () => void;
}

export default function ObligacionDetailSheet({ open, onOpenChange, obligacionId, ocurrenciaId = null, onCumplimientoChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ob, setOb] = useState<any>(null);
  const [isCumplida, setIsCumplida] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evidencia, setEvidencia] = useState('');
  const [periodKey, setPeriodKey] = useState('');
  const [activeOcurrenciaId, setActiveOcurrenciaId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<any[]>([]);

  useEffect(() => {
    if (open && (obligacionId || ocurrenciaId)) fetchData();
  }, [open, obligacionId, ocurrenciaId]);

  const fetchData = async () => {
    setLoading(true);
    setEvidencia('');

    // Resolver la obligación + la ocurrencia objetivo.
    let resolvedObligacionId = obligacionId;
    let targetOcurrencia: any = null;

    if (ocurrenciaId) {
      // Vía calendario: cargar la ocurrencia concreta y su obligación.
      const { data: oc } = await supabase
        .from('obligacion_ocurrencias')
        .select('*, obligaciones(*, empresas(id, razon_social))')
        .eq('id', ocurrenciaId)
        .maybeSingle();
      if (!oc) { setLoading(false); return; }
      targetOcurrencia = oc;
      resolvedObligacionId = (oc as any).obligacion_id;
      const obl = (oc as any).obligaciones;
      // Merge: datos de la obligación + fecha/periodo de la ocurrencia.
      setOb({ ...obl, id: (oc as any).obligacion_id, fecha_vencimiento: (oc as any).fecha_vencimiento });
      setPeriodKey((oc as any).periodo_key);
      setActiveOcurrenciaId((oc as any).id);
    } else {
      // Vía legacy: obligación + próxima ocurrencia pendiente (o la más próxima).
      const { data, error } = await supabase
        .from('obligaciones')
        .select('*, empresas(id, razon_social)')
        .eq('id', obligacionId)
        .maybeSingle();
      if (error || !data) { setLoading(false); return; }

      const { data: oc } = await supabase
        .from('obligacion_ocurrencias')
        .select('*')
        .eq('obligacion_id', obligacionId!)
        .order('fecha_vencimiento', { ascending: true })
        .limit(1)
        .maybeSingle();

      targetOcurrencia = oc;
      setOb({ ...data, fecha_vencimiento: (oc as any)?.fecha_vencimiento ?? data.fecha_vencimiento });
      setPeriodKey((oc as any)?.periodo_key ?? getCurrentPeriodKey(data.presentacion));
      setActiveOcurrenciaId((oc as any)?.id ?? null);
    }

    // Estado de cumplimiento vigente para la ocurrencia objetivo.
    if (targetOcurrencia?.id) {
      const { data: cumpl } = await supabase
        .from('obligacion_cumplimientos')
        .select('*')
        .eq('ocurrencia_id', targetOcurrencia.id)
        .eq('vigente', true)
        .maybeSingle();
      setIsCumplida(!!cumpl && cumpl.completada);
      if (cumpl?.notas) setEvidencia(cumpl.notas);
    } else {
      setIsCumplida(false);
    }

    // Historial: por obligación padre.
    if (resolvedObligacionId) {
      const { data: hist } = await supabase
        .from('obligacion_cumplimientos')
        .select('*, profiles(nombre_completo)')
        .eq('obligacion_id', resolvedObligacionId)
        .order('created_at', { ascending: false })
        .limit(5);
      setHistorial(hist || []);
    }
    setLoading(false);
  };

  const handleMarcarCumplida = async () => {
    if (!ob || !user) return;
    if (!activeOcurrenciaId) { toast.error('No hay una ocurrencia asociada para registrar'); return; }
    setSaving(true);
    try {
      if (isCumplida) {
        // Desmarcar = corrección append-only (nunca DELETE).
        const { data: existing } = await supabase
          .from('obligacion_cumplimientos')
          .select('id')
          .eq('ocurrencia_id', activeOcurrenciaId)
          .eq('vigente', true)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await supabase.rpc('corregir_cumplimiento', {
            p_cumplimiento_id: existing.id, p_completada: false, p_notas: null,
          });
          if (error) throw error;
        }
        setIsCumplida(false);
        toast.success('Cumplimiento desmarcado');
      } else {
        const { error } = await supabase
          .from('obligacion_cumplimientos')
          .insert({
            obligacion_id: ob.id,
            ocurrencia_id: activeOcurrenciaId,
            empresa_id: ob.empresa_id,
            periodo_key: periodKey,
            completada: true,
            completada_por: user.id,
            notas: evidencia || null,
          });
        if (error) throw error;
        setIsCumplida(true);
        toast.success('¡Cumplimiento registrado correctamente!');

        await supabase.from('notificaciones').insert({
          user_id: user.id,
          tipo: 'cumplimiento',
          titulo: `Obligación cumplida: ${ob.nombre}`,
          contenido: `Periodo: ${getPeriodLabel(ob.presentacion, periodKey)}${evidencia ? ` · ${evidencia.slice(0, 80)}` : ''}`,
          referencia_id: ob.empresa_id,
          referencia_tipo: 'empresa',
          leida: false,
        });
      }
      onCumplimientoChange?.();
      await fetchData();
    } catch (e: any) {
      toast.error('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!ob && !loading) return null;

  const vInfo = ob ? getVencimientoInfo(ob.fecha_vencimiento) : null;
  const periodLabel = ob ? getPeriodLabel(ob.presentacion, periodKey) : '';

  const statusBadge = () => {
    if (isCumplida) return <Badge className="bg-success/15 text-success border-success/25 gap-1"><CheckCircle2 className="w-3 h-3" />Cumplida</Badge>;
    if (!vInfo) return null;
    if (vInfo.status === 'vencido') return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Vencida hace {Math.abs(vInfo.days)}d</Badge>;
    if (vInfo.days === 0) return <Badge className="bg-destructive/15 text-destructive border-destructive/25 gap-1"><AlertCircle className="w-3 h-3" />Vence hoy</Badge>;
    if (vInfo.status === 'urgente') return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3" />Vence en {vInfo.days}d</Badge>;
    if (vInfo.status === 'proximo') return <Badge className="bg-warning/15 text-warning border-warning/25 gap-1"><Calendar className="w-3 h-3" />{vInfo.days}d</Badge>;
    return <Badge className="bg-success/15 text-success border-success/25 gap-1"><CheckCircle2 className="w-3 h-3" />Vigente</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0" side="right">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : ob ? (
          <>
            <div className="bg-muted/40 border-b border-border px-6 py-5">
              <SheetHeader>
                <SheetTitle className="font-heading text-base leading-snug pr-6">{ob.nombre}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-wrap gap-2 mt-3">
                {statusBadge()}
                <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                  {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                </Badge>
                <Badge variant="outline" className="text-xs">{ob.presentacion || 'Única'}</Badge>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Periodo actual</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{periodLabel}</p>
                </div>
                {isCumplida ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-warning" />}
              </div>

              <div className="space-y-2">
                {[
                  { icon: Building2, label: 'Empresa',         value: ob.empresas?.razon_social },
                  { icon: Calendar,  label: 'Vencimiento',     value: formatDateShort(ob.fecha_vencimiento) },
                  { icon: User,      label: 'Responsable',     value: ob.responsable || '—' },
                  { icon: FileText,  label: 'Fundamento legal', value: ob.articulos || '—' },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ) : null)}
              </div>

              {ob.descripcion && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                  {ob.descripcion}
                </div>
              )}

              {!isCumplida && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Notas / evidencia (opcional)
                  </label>
                  <Textarea
                    placeholder="Número de folio, observaciones, archivo referenciado…"
                    value={evidencia}
                    onChange={e => setEvidencia(e.target.value)}
                    className="text-sm min-h-[80px] resize-none"
                  />
                </div>
              )}

              <Button
                className={`w-full gap-2 ${isCumplida ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-success hover:bg-success/90 text-white'}`}
                onClick={handleMarcarCumplida}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : isCumplida ? (
                  <><RotateCcw className="w-4 h-4" /> Desmarcar cumplimiento</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Marcar como cumplida</>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => { onOpenChange(false); navigate(`/empresas/${ob.empresa_id}`); }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver todas las obligaciones de esta empresa
              </Button>

              {historial.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historial reciente</p>
                  <div className="space-y-2">
                    {historial.map(h => (
                      <div key={h.id} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">{h.periodo_key}</span>
                          {h.profiles?.nombre_completo && (
                            <span className="text-muted-foreground"> · {h.profiles.nombre_completo}</span>
                          )}
                          {h.notas && <p className="text-muted-foreground mt-0.5">{h.notas}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
