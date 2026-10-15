import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { obligationOverviewClient } from '@/hooks/useObligationOverview';
import { mexicoDateKey } from '@/lib/obligationDate';
import { getErrorMessage } from '@/lib/errors';
import { toast } from 'sonner';
import type { OverviewObligation } from '@/lib/obligationOverviewData';

export function RegistrarSeguimientoDialog({ ob, mode, onClose, onSaved }: { ob: OverviewObligation; mode: 'revision' | 'evento'; onClose: () => void; onSaved: () => void }) {
 const [resultado,setResultado]=useState('verificada');
 const [notas,setNotas]=useState('');
 const [tipo,setTipo]=useState('');
 const [fecha,setFecha]=useState(mode==='evento'?mexicoDateKey():'');
 const [file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [locked,setLocked]=useState(false);
 const [error,setError]=useState('');
 const [key]=useState(()=>crypto.randomUUID());
 const path=useRef<string|null>(null);
 const save=async()=>{
  if(mode==='evento'&&(!tipo.trim()||!fecha)){setError('Indica qué ocurrió y su fecha.');return;}
  if(mode==='revision'&&resultado==='no_aplica'&&!notas.trim()){setError('Explica por qué no aplica.');return;}
  if(file&&(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){setError('Adjunta un PDF o imagen de hasta 10 MB.');return;}
  setBusy(true);setLocked(true);setError('');
  try {
   if(file&&!path.current){
    const objectPath=`${ob.empresaId}/${ob.id}/seguimiento/${key}.${file.name.split('.').pop()}`;
    const upload=await supabase.storage.from('evidencias-cumplimiento').upload(objectPath,file,{upsert:false});
    if(upload.error)throw upload.error;
    path.current=objectPath;
   }
   const result=mode==='evento'
    ?await obligationOverviewClient.rpc('registrar_evento_obligacion',{p_obligacion_id:ob.id,p_tipo_evento:tipo.trim(),p_fecha_evento:fecha,p_idempotency_key:key,...(path.current?{p_evidencia_path:path.current}:{})})
    :await obligationOverviewClient.rpc('registrar_revision_obligacion',{p_obligacion_id:ob.id,p_resultado:resultado,...(notas.trim()?{p_notas:notas.trim()}:{}),...(fecha?{p_proxima_revision:fecha}:{}),...(path.current?{p_evidencia_path:path.current}:{})});
   if(result.error)throw result.error;
   if(!result.data)throw new Error('El servidor no confirmó el registro.');
   toast.success(mode==='evento'?'Evento registrado':'Revisión registrada');onSaved();onClose();
  } catch(e){setError(getErrorMessage(e)||'No se pudo guardar. Reintenta con los mismos datos.');}
  finally{setBusy(false);}
 };
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{mode==='evento'?'Registrar evento':'Registrar revisión'}</DialogTitle><DialogDescription>{ob.nombre}</DialogDescription></DialogHeader>
  <div className="space-y-4">
   {mode==='revision'?<div><Label htmlFor="revision-resultado">Resultado</Label><select id="revision-resultado" className="block w-full border rounded-md bg-background px-3 py-2" disabled={locked} value={resultado} onChange={e=>setResultado(e.target.value)}><option value="verificada">Verificada</option><option value="requiere_atencion">Requiere atención</option><option value="no_aplica">No aplica (requiere motivo)</option></select></div>:<div><Label htmlFor="evento-tipo">Qué ocurrió</Label><Input id="evento-tipo" disabled={locked} value={tipo} onChange={e=>setTipo(e.target.value)} placeholder="Describe el cambio o supuesto" /></div>}
   <div><Label htmlFor="seguimiento-fecha">{mode==='evento'?'Fecha en que ocurrió':'Próxima revisión interna (opcional)'}</Label><Input id="seguimiento-fecha" type="date" disabled={locked} max={mode==='evento'?mexicoDateKey():undefined} min={mode==='revision'?mexicoDateKey():undefined} value={fecha} onChange={e=>setFecha(e.target.value)} /></div>
   {mode==='revision'&&<div><Label htmlFor="revision-notas">Notas o motivo</Label><Textarea id="revision-notas" disabled={locked} value={notas} onChange={e=>setNotas(e.target.value)} /></div>}
   <div><Label htmlFor="seguimiento-evidencia">Evidencia (opcional)</Label><Input id="seguimiento-evidencia" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={locked} onChange={e=>setFile(e.target.files?.[0]??null)} /></div>
   {mode==='evento'&&<p className="text-xs text-muted-foreground">La fecha del evento es su origen. Si falta validar la regla del plazo, el seguimiento queda sin vencimiento calculado.</p>}
   {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  </div><DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':error&&locked?'Reintentar':'Guardar'}</Button></DialogFooter>
 </DialogContent></Dialog>;
}
