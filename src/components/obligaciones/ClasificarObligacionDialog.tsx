import { useState } from 'react';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { obligationOverviewClient as client } from '@/hooks/useObligationOverview';
import type { OverviewObligation } from '@/lib/obligationOverviewData';
import { getErrorMessage } from '@/lib/errors';
export function ClasificarObligacionDialog({ob,onClose,onSaved}:{ob:OverviewObligation;onClose:()=>void;onSaved:()=>void}){
 const {user}=useAuth();const [tipo,setTipo]=useState('condicion');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const save=async()=>{if(!user)return;setBusy(true);setError('');try{
  const previous=await client.from('obligacion_reglas').select('version').eq('obligacion_id',ob.id).order('version',{ascending:false}).limit(1).maybeSingle();if(previous.error)throw previous.error;
  const result=await client.from('obligacion_reglas').insert({obligacion_id:ob.id,version:(previous.data?.version??0)+1,tipo_control:tipo,origen_control:'mixto',clasificacion_estado:'aprobada',normativa_estado:'pendiente',created_by:user.id,aplicabilidad:{},parametros:{}});if(result.error)throw result.error;
  onSaved();onClose();
 }catch(e){setError(getErrorMessage(e)||'No se pudo clasificar.');}finally{setBusy(false);}};
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent><DialogHeader><DialogTitle>Clasificar obligación</DialogTitle><DialogDescription>{ob.nombre}</DialogDescription></DialogHeader><Label htmlFor="clasificacion-tipo">Cómo se da seguimiento</Label><select id="clasificacion-tipo" className="border rounded-md bg-background p-2" disabled={busy} value={tipo} onChange={e=>setTipo(e.target.value)}><option value="condicion">Condición permanente, con revisiones</option><option value="periodica">Entrega por periodo</option><option value="evento">Se activa cuando ocurre un evento</option><option value="vigencia">Vigencia de documento o autorización</option></select><p className="text-sm text-muted-foreground">Esto organiza el seguimiento. No aprueba plazos legales ni modifica las fechas o el historial existentes.</p>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Guardando…':'Guardar clasificación'}</Button></DialogFooter></DialogContent></Dialog>;
}
