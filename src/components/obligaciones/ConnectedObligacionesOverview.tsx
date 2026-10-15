import { lazy, Suspense, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { mexicoDateKey } from '@/lib/obligationDate';
import { useAuth } from '@/hooks/useAuth';
import { useObligationOverview, obligationOverviewClient } from '@/hooks/useObligationOverview';
import { ObligacionesOverview } from './ObligacionesOverview';
import { EvidenciaCumplimiento } from './EvidenciaCumplimiento';
import { ClasificarObligacionDialog } from './ClasificarObligacionDialog';
import { RegistrarSeguimientoDialog } from './RegistrarSeguimientoDialog';
import { CumplimientoHistorial } from './CumplimientoHistorial';
import type { OverviewAction, OverviewObligation } from '@/lib/obligationOverviewData';
const TareaDetailSheet = lazy(() => import('@/components/tareas/TareaDetailSheet'));

/** Montar con key empresaId para que un cambio de empresa cierre todos los diálogos. */
export function ConnectedObligacionesOverview({ empresaId }: { empresaId: string }) {
  const { user, role, actualRole } = useAuth();
  const canRecord = actualRole === 'administrador' || actualRole === 'consultor' || actualRole === 'cliente';
  const query = useObligationOverview(empresaId);
  const [selected, setSelected] = useState<OverviewAction | null>(null);
  const [history, setHistory] = useState<OverviewObligation | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [classification,setClassification]=useState<OverviewObligation|null>(null);
  const [tracking,setTracking]=useState<{ob:OverviewObligation;mode:'revision'|'evento'}|null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const register = async (accion: OverviewAction) => {
    if (!user || (!accion.ocurrenciaId && !accion.eventoId) || accion.empresaId !== empresaId) return;
    setBusyId(accion.id);
    try {
      const { data, error } = await obligationOverviewClient.rpc('obligacion_v2_puede_registrar', { p_obligacion_id: accion.obligacionId });
      if (error) throw error;
      if (!data) { toast.error('No tienes permiso para registrar en esta empresa'); return; }
      setSelected(accion);
    } catch {
      toast.error('No pudimos comprobar el permiso. Intenta de nuevo.');
    } finally { setBusyId(null); }
  };
  if (query.isPending) return <div role="status" className="py-12 text-sm text-muted-foreground">Cargando obligaciones…</div>;
  if (query.isError || !query.data) return <div role="alert" className="border rounded-lg p-6 space-y-3"><AlertCircle className="h-5 w-5 text-destructive" /><p className="text-sm">No pudimos cargar las obligaciones de esta empresa.</p><Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button></div>;
  const selectedParent = query.data.obligaciones.find(ob => ob.id === selected?.obligacionId);
  return <>
    <div className="flex justify-end"><Button variant="outline" onClick={()=>void import('@/lib/obligationPdf').then(module=>module.exportObligationOverview(query.data!,mexicoDateKey())).catch(()=>toast.error('No pudimos generar el PDF'))}>Exportar PDF</Button></div>
    <ObligacionesOverview data={query.data} hoy={mexicoDateKey()} busyId={busyId}
      canRegister={(ob,accion) => ob.empresaId === empresaId && query.data.metadataReady && !query.isFetching && (!!accion.ocurrenciaId || !!accion.eventoId) && !accion.completada && canRecord}
      onEvidence={path=>void supabase.storage.from('evidencias-cumplimiento').createSignedUrl(path,60).then(({data,error})=>{if(error||!data?.signedUrl){toast.error('No pudimos abrir la evidencia');return;}window.open(data.signedUrl,'_blank','noopener,noreferrer');}).catch(()=>toast.error('No pudimos abrir la evidencia'))}
      onClassify={role==='administrador'?setClassification:undefined}
      canManage={ob=>ob.empresaId===empresaId&&query.data.metadataReady&&canRecord} onRevision={ob=>setTracking({ob,mode:'revision'})} onEvent={ob=>setTracking({ob,mode:'evento'})}
      onRegister={accion => void register(accion)} onHistory={setHistory} onTask={task => setTaskId(task.id)} />
    {selected && selectedParent && user && <EvidenciaCumplimiento open onOpenChange={open => { if (!open) setSelected(null); }} empresaId={empresaId} obligacionId={selectedParent.id} ocurrenciaId={selected.ocurrenciaId} eventoId={selected.eventoId} periodoKey={selected.periodo!} userId={user.id} onCompleted={() => { setSelected(null); void query.refetch(); }} />}
    {classification&&<ClasificarObligacionDialog ob={classification} onClose={()=>setClassification(null)} onSaved={()=>void query.refetch()} />}
    {tracking&&<RegistrarSeguimientoDialog key={`${tracking.ob.id}:${tracking.mode}`} ob={tracking.ob} mode={tracking.mode} onClose={()=>setTracking(null)} onSaved={()=>void query.refetch()} />}
    {history && <CumplimientoHistorial open onOpenChange={open => { if (!open) setHistory(null); }} obligacionId={history.id} obligacionNombre={history.nombre} presentacion={history.presentacion} />}
    {taskId && <Suspense fallback={<p role="status">Cargando tarea…</p>}><TareaDetailSheet open onOpenChange={open => { if (!open) setTaskId(null); }} tareaId={taskId} onUpdate={() => void query.refetch()} /></Suspense>}
  </>;
}
