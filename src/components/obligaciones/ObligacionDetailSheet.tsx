import { Input } from '@/components/ui/input';
import { isWeekendDate } from '@/lib/dashboardCalendar';
import { RegistrarSeguimientoDialog } from './RegistrarSeguimientoDialog';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { obligationOverviewClient } from '@/hooks/useObligationOverview';
import { toast } from 'sonner';
import {
  CheckCircle2, AlertCircle, Clock, Calendar, Building2,
  FileText, User, RefreshCw, ExternalLink, RotateCcw,
} from 'lucide-react';
import {
  getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS, estadoPorOcurrencias,
  getVencimientoInfo, formatDateShort,
} from '@/lib/obligaciones';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/errors';
import type { ObligacionDetalle, CumplimientoConPerfil } from '@/types/domain';
import { conPerfiles } from '@/lib/perfiles';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligacionId: string | null;
  /** Fase 2: si viene, el sheet opera sobre ESTA ocurrencia concreta (calendario). */
  ocurrenciaId?: string | null;
  revisionId?: string | null;
  onCumplimientoChange?: () => void;
}

export default function ObligacionDetailSheet({ open, onOpenChange, obligacionId, ocurrenciaId = null, revisionId = null, onCumplimientoChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ob, setOb] = useState<ObligacionDetalle | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [origenFecha, setOrigenFecha] = useState<string | null>(null);
  const [recordReview, setRecordReview] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const busy = useRef(false);
  const request = useRef(0);
  const [isCumplida, setIsCumplida] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [evidencia, setEvidencia] = useState('');
  const [periodKey, setPeriodKey] = useState('');
  const [activeOcurrenciaId, setActiveOcurrenciaId] = useState<string | null>(null);
  const [historial, setHistorial] = useState<CumplimientoConPerfil[]>([]);
  const [responsableNombre, setResponsableNombre] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const token = ++request.current;
    setLoading(true);
    setLoadError('');
    setCanRecord(false);
    setOb(null);
    setEvidencia('');
    setFile(null);
    uploaded.current = null;
    setActiveOcurrenciaId(null);
    setHistorial([]);
    setIsCumplida(false);
    setRecordReview(false);
    try {
      let parentId = obligacionId;
      let target: { id: string; obligacion_id: string; periodo_key: string; fecha_vencimiento: string; origen_fecha?: string } | null = null;
      let reviewDate: string | null = null;
      if (revisionId) {
        const result = await obligationOverviewClient.from('obligacion_revisiones').select('id, obligacion_id, proxima_revision').eq('id', revisionId).single();
        if (result.error) throw result.error;
        if (parentId && result.data.obligacion_id !== parentId) throw new Error('La revisión no corresponde a esta obligación');
        parentId = result.data.obligacion_id;
        reviewDate = result.data.proxima_revision;
      } else if (ocurrenciaId) {
        const result = await obligationOverviewClient.from('obligacion_ocurrencias').select('id, obligacion_id, periodo_key, fecha_vencimiento, origen_fecha').eq('id', ocurrenciaId).single();
        if (result.error) throw result.error;
        if (parentId && result.data.obligacion_id !== parentId) throw new Error('La ocurrencia no corresponde a esta obligación');
        target = result.data;
        parentId = result.data.obligacion_id;
      }
      if (!parentId) throw new Error('No se encontró la obligación');
      const parent = await supabase.from('obligaciones').select('*, empresas(id, razon_social)').eq('id', parentId).single();
      if (parent.error) throw parent.error;
      if (!target && !revisionId) {
        const result = await obligationOverviewClient.from('obligacion_ocurrencias').select('id, obligacion_id, periodo_key, fecha_vencimiento, origen_fecha').eq('obligacion_id', parentId).order('fecha_vencimiento');
        if (result.error) throw result.error;
        const actual = estadoPorOcurrencias(result.data, new Set()).get(parentId)?.actual;
        target = result.data.find(oc => oc.id === actual?.id) ?? null;
      }
      const [permission, completion, history, responsible] = await Promise.all([
        obligationOverviewClient.rpc('obligacion_v2_puede_registrar', { p_obligacion_id: parentId }),
        target ? supabase.from('obligacion_cumplimientos').select('*').eq('ocurrencia_id', target.id).eq('vigente', true).maybeSingle() : Promise.resolve({ data: null, error: null }),
        supabase.from('obligacion_cumplimientos').select('*').eq('obligacion_id', parentId).order('created_at', { ascending: false }).limit(5),
        parent.data.responsable_id ? supabase.from('profiles').select('nombre_completo').eq('id', parent.data.responsable_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (completion.error) throw completion.error;
      if (history.error) throw history.error;
      const hist = await conPerfiles(history.data ?? [], 'completada_por');
      if (token !== request.current) return;
      setOb({ ...parent.data, fecha_vencimiento: revisionId ? reviewDate : target?.fecha_vencimiento ?? parent.data.fecha_vencimiento });
      setPeriodKey(revisionId ? 'revision' : target?.periodo_key ?? getCurrentPeriodKey(parent.data.presentacion));
      setOrigenFecha(revisionId ? 'interna' : target?.origen_fecha ?? 'heredada');
      setActiveOcurrenciaId(target?.id ?? null);
      setCanRecord(!permission.error && !!permission.data && parent.data.activa);
      setIsCumplida(!!completion.data?.completada);
      setEvidencia(completion.data?.notas ?? '');
      setHistorial(hist);
      setResponsableNombre(responsible.data?.nombre_completo ?? null);
      if (permission.error) setLoadError('No pudimos comprobar el permiso para registrar. Recarga para reintentar.');
    } catch (error) {
      if (token === request.current) setLoadError(getErrorMessage(error) || 'No pudimos cargar el detalle.');
    } finally { if (token === request.current) setLoading(false); }
  }, [obligacionId, ocurrenciaId, revisionId]);

  useEffect(() => {
    if (open && (obligacionId || ocurrenciaId || revisionId)) void fetchData();
    return () => { request.current++; };
  }, [open, obligacionId, ocurrenciaId, revisionId, fetchData]);

  const handleMarcarCumplida = async () => {
    if (!ob || !user || !canRecord || busy.current) return;
    if (!activeOcurrenciaId) { toast.error('No hay una ocurrencia asociada para registrar'); return; }
    busy.current = true;
    setSaving(true);
    try {
      if (isCumplida) {
        // Desmarcar = corrección append-only (nunca DELETE).
        const { data: existing, error: existingError } = await supabase
          .from('obligacion_cumplimientos')
          .select('id')
          .eq('ocurrencia_id', activeOcurrenciaId)
          .eq('vigente', true)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) throw new Error('No se encontró el cumplimiento vigente. Recarga el detalle.');
        if (existing.id) {
          const { error } = await supabase.rpc('corregir_cumplimiento', {
            p_cumplimiento_id: existing.id, p_completada: false,
          });
          if (error) throw error;
        }
        setIsCumplida(false);
        toast.success('Cumplimiento desmarcado');
      } else {
        let evidencePath: string | null = null;
        if (file) {
          const extensions: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
          if (!extensions[file.type] || file.size > 10 * 1024 * 1024) throw new Error('Adjunta un PDF o imagen de hasta 10 MB.');
          if (uploaded.current?.file !== file) {
            const path = `${ob.empresa_id}/${ob.id}/${periodKey}/${crypto.randomUUID()}.${extensions[file.type]}`;
            const upload = await supabase.storage.from('evidencias-cumplimiento').upload(path, file);
            if (upload.error) throw upload.error;
            uploaded.current = { file, path };
          }
          evidencePath = uploaded.current!.path;
        }
        const { data, error } = await obligationOverviewClient.rpc('registrar_cumplimiento_obligacion', {
          p_obligacion_id: ob.id,
          p_ocurrencia_id: activeOcurrenciaId,
          p_periodo_key: periodKey,
          ...(evidencia.trim() ? { p_notas: evidencia.trim() } : {}),
          ...(evidencePath ? { p_evidencia_path: evidencePath } : {}),
        });
        if (error) throw error;
        if (!data) throw new Error('El servidor no confirmó el cumplimiento');
        setIsCumplida(true);
        toast.success('¡Cumplimiento registrado correctamente!');
      }
      onCumplimientoChange?.();
      await fetchData();
    } catch (e) {
      toast.error('Error al guardar: ' + getErrorMessage(e));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const vInfo = ob ? getVencimientoInfo(ob.fecha_vencimiento) : null;
  const periodLabel = ob ? revisionId ? 'Revisión interna' : getPeriodLabel(ob.presentacion, periodKey) : '';

  const dateNoun = origenFecha === 'interna' ? 'Objetivo' : origenFecha === 'heredada' ? 'Fecha registrada' : 'Vencimiento';
  const statusBadge = () => {
    if (isCumplida) return <Badge className="bg-success/15 text-success border-success/25 gap-1"><CheckCircle2 className="w-3 h-3" />Cumplida</Badge>;
    if (!vInfo) return null;
    if (vInfo.status === 'vencido') return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />{origenFecha === 'interna' ? 'Objetivo atrasado' : origenFecha === 'heredada' ? 'Fecha registrada pasada' : 'Vencida'} · {Math.abs(vInfo.days)}d</Badge>;
    if (vInfo.days === 0) return <Badge className="bg-destructive/15 text-destructive border-destructive/25 gap-1"><AlertCircle className="w-3 h-3" />{dateNoun} hoy</Badge>;
    if (vInfo.status === 'urgente') return <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1"><Clock className="w-3 h-3" />{dateNoun} en {vInfo.days}d</Badge>;
    if (vInfo.status === 'proximo') return <Badge className="bg-warning/15 text-warning border-warning/25 gap-1"><Calendar className="w-3 h-3" />{vInfo.days}d</Badge>;
    return <Badge className="bg-success/15 text-success border-success/25 gap-1"><CheckCircle2 className="w-3 h-3" />Vigente</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0" side="right">
        {(loading || !ob) && <SheetTitle className="sr-only">Detalle de obligación</SheetTitle>}
        <SheetDescription className="sr-only">Consulta el periodo seleccionado y registra su cumplimiento.</SheetDescription>
        {loadError && <div role="alert" className="text-sm text-destructive p-6 space-y-2"><p>{loadError}</p><Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>Reintentar</Button></div>}
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
                  <p className="text-xs text-muted-foreground font-medium">Periodo seleccionado</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{periodLabel}</p>
                </div>
                {isCumplida ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-warning" />}
              </div>

              <div className="space-y-2">
                {[
                  { icon: Building2, label: 'Empresa',         value: ob.empresas?.razon_social },
                  { icon: Calendar,  label: origenFecha === 'interna' ? 'Objetivo interno' : origenFecha === 'heredada' ? 'Fecha registrada' : 'Vencimiento',     value: formatDateShort(ob.fecha_vencimiento) },
                  { icon: User,      label: 'Responsable',     value: responsableNombre || '—' },
                  { icon: FileText,  label: 'Referencia', value: ob.articulos || '—' },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-start gap-3 text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ) : null)}
              </div>

              {isWeekendDate(ob.fecha_vencimiento) && <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><Calendar className="w-3 h-3" />Cae en fin de semana</Badge>}

              {ob.descripcion && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                  {ob.descripcion}
                </div>
              )}

              {!isCumplida && canRecord && !revisionId && activeOcurrenciaId && (
                <div className="space-y-2">
                  <label htmlFor="calendar-completion-notes" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Folio y notas (opcional)
                  </label>
                  <Textarea
                    id="calendar-completion-notes"
                    disabled={saving}
                    placeholder="Número de folio, observaciones, archivo referenciado…"
                    value={evidencia}
                    onChange={e => setEvidencia(e.target.value)}
                    className="text-sm min-h-[80px] resize-none"
                  />
                  <label htmlFor="calendar-completion-file" className="text-xs text-muted-foreground">Archivo de evidencia (opcional)</label>
                  <Input id="calendar-completion-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={saving} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              )}

              {canRecord && !revisionId && activeOcurrenciaId && <Button
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
              </Button>}
              {canRecord && revisionId && <Button className="w-full" onClick={() => setRecordReview(true)}>Registrar revisión</Button>}
              {!canRecord && !loadError && <p className="text-xs text-muted-foreground">Solo consulta: no tienes permiso para registrar en esta obligación.</p>}

              <Button
                disabled={saving}
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
                          <span className="font-medium text-foreground">{getPeriodLabel(ob?.presentacion ?? null, h.periodo_key)}</span>
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
      {recordReview && ob && <RegistrarSeguimientoDialog ob={{ id: ob.id, empresaId: ob.empresa_id, nombre: ob.nombre }} mode="revision" onClose={() => setRecordReview(false)} onSaved={() => { setRecordReview(false); onCumplimientoChange?.(); onOpenChange(false); }} />}
    </Sheet>
  );
}
