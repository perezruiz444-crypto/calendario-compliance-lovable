import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { obligationOverviewClient } from '@/hooks/useObligationOverview';
import { ANEXO30_INICIAL, anexo30BaseDate, type Anexo30Frequency } from '@/lib/anexo30';
import { mexicoDateKey } from '@/lib/obligationDate';
import { formatDateShort } from '@/lib/obligaciones';
import { getErrorMessage } from '@/lib/errors';
import type { OverviewObligation } from '@/lib/obligationOverviewData';
import { toast } from 'sonner';

interface Preview { fecha_base: string; fecha_limite: string | null; periodo_inicio: string; periodo_fin: string; motivo: string | null }
export function CalendarioAnexo30Dialog({ ob, canSave, onClose, onSaved }: { ob: OverviewObligation; canSave: boolean; onClose: () => void; onSaved: () => void }) {
  const inicial = ob.catalogoId === ANEXO30_INICIAL;
  const [frequency, setFrequency] = useState<Anexo30Frequency | ''>(inicial ? 'inicial' : '');
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const origin = inicial ? value : value ? `${value}-01` : '';
  const base = frequency ? anexo30BaseDate(origin, frequency) : null;
  const today = mexicoDateKey();
  useEffect(() => {
    let current = true;
    setPreview(null); setError('');
    if (!base || !frequency) { setChecking(false); return; }
    setChecking(true);
    void Promise.resolve(obligationOverviewClient.rpc('previsualizar_anexo30', { p_obligacion_id: ob.id, p_frecuencia: frequency, p_origen: origin })).then(({ data, error: failure }) => {
      if (!current) return;
      setChecking(false);
      if (failure) setError(getErrorMessage(failure));
      else setPreview(data as unknown as Preview);
    }).catch(() => { if (current) { setChecking(false); setError('No se pudo verificar el calendario. Vuelve a intentarlo.'); } });
    return () => { current = false; };
  }, [ob.id, frequency, origin, base, attempt]);
  const past = !!preview?.fecha_limite && preview.fecha_limite < today;
  const futureEvent = inicial && !!origin && origin > today;
  const save = async () => {
    if (!frequency || !preview?.fecha_limite || past || futureEvent || !canSave || checking || busy) return;
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await obligationOverviewClient.rpc('programar_anexo30', { p_obligacion_id: ob.id, p_frecuencia: frequency, p_origen: origin });
      if (failure) throw failure;
      if (!data) throw new Error('El servidor no confirmó el seguimiento.');
      toast.success(inicial ? 'Inicio registrado y plazo calculado' : 'Periodo programado; pendiente de presentar');
      onSaved(); onClose();
    } catch (failure) { setError(getErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-lg">
    <DialogHeader><DialogTitle>Calendario del Anexo 30</DialogTitle><DialogDescription>{ob.nombre}</DialogDescription></DialogHeader>
    <div className="space-y-4">
      {!inicial && <div><Label htmlFor="anexo30-frecuencia">Periodicidad de este informe</Label><select id="anexo30-frecuencia" className="block w-full border rounded-md bg-background px-3 py-2" disabled={busy} value={frequency} onChange={event => { setPreview(null); setFrequency(event.target.value as Anexo30Frequency | ''); }}><option value="">Selecciona una opción</option><option value="mensual">Mensual</option><option value="bimestral">Bimestral</option></select></div>}
      <div><Label htmlFor="anexo30-origen">{inicial ? 'Inicio real de vigencia de la certificación o aceptación de garantía' : frequency === 'bimestral' ? 'Primer mes del bimestre de operaciones' : 'Mes de operaciones'}</Label><Input id="anexo30-origen" type={inicial ? 'date' : 'month'} disabled={busy} value={value} onChange={event => { setPreview(null); setValue(event.target.value); }} /></div>
      <p className="text-sm text-muted-foreground">{inicial ? 'Inventario inicial: treinta días naturales posteriores al inicio. Registrar esta fecha no acredita la transmisión del inventario.' : 'El informe se presenta dentro del mes calendario siguiente al cierre del mes o bimestre seleccionado. Programarlo no acredita operaciones ni su presentación.'}</p>
      {base && <div className="rounded-md border p-3 space-y-2" aria-live="polite"><p>Plazo base: <strong>{formatDateShort(base)}</strong></p>
        {preview && !inicial && <p className="text-sm">Operaciones: {formatDateShort(preview.periodo_inicio)} a {formatDateShort(preview.periodo_fin)}</p>}
        {checking ? <p className="text-sm">Verificando calendario…</p> : preview?.fecha_limite ? <p>Límite para presentar: <strong>{formatDateShort(preview.fecha_limite)}</strong>{preview.fecha_limite !== base && <span className="text-sm block">Prorrogado al siguiente día hábil conforme al calendario verificado.</span>}</p> : preview && <p className="text-sm">El plazo base está calculado. Falta verificar el calendario de días inhábiles para esta fecha; todavía no se generará un vencimiento.</p>}
      </div>}
      {past && <p className="text-sm">Este plazo ya pasó. Consulta sus antecedentes; no se generará un atraso retroactivo.</p>}
      {futureEvent && <p className="text-sm">Puedes consultar el cálculo, pero registra el inicio cuando haya ocurrido.</p>}
      <p className="text-xs text-muted-foreground">Fundamento: Anexo 30 de las RGCE, apartados I y III; artículo 12 del CFF para la prórroga por días inhábiles.</p>
      {error && <div role="alert" className="text-sm text-destructive"><p>{error}</p>{base && !preview && <Button variant="outline" size="sm" disabled={checking || busy} onClick={() => setAttempt(previous => previous + 1)}>Volver a calcular</Button>}</div>}
    </div>
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button>{canSave && <Button disabled={busy || checking || !preview?.fecha_limite || past || futureEvent} onClick={() => void save()}>{busy ? 'Guardando…' : inicial ? 'Registrar inicio y plazo' : 'Programar periodo'}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}
