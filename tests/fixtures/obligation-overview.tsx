// Entrada Vite de pruebas: no se importa desde la aplicación ni se incluye en el build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ObligacionesOverview } from '../../src/components/obligaciones/ObligacionesOverview';
import { buildOverviewData, type OverviewSources, type OverviewObligation } from '../../src/lib/obligationOverviewData';
import { Button } from '../../src/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../src/components/ui/dialog';
import demo from './obligation-demo.json';
import '../../src/index.css';
export function Preview() {
  const [sources,setSources]=useState(demo as OverviewSources);
  const [history,setHistory]=useState<OverviewObligation|null>(null);
  const [task,setTask]=useState<string|null>(null);
  return <main className="min-h-screen bg-background text-foreground p-4 sm:p-8"><div className="max-w-4xl mx-auto space-y-5">
    <header><h1 className="font-heading text-3xl font-semibold normal-case">Pendientes</h1><p className="text-sm text-muted-foreground mt-1">Prueba local · datos, fechas y estados ficticios</p></header>
    <ObligacionesOverview data={buildOverviewData(sources)} hoy="2026-10-14" canRegister={(ob,a)=>ob.asignadaAMi&&!!a.ocurrenciaId&&!a.completada} onHistory={setHistory} onTask={t=>setTask(t.titulo)}
      onRegister={a=>setSources(prev=>({...prev,cumplimientos:[...prev.cumplimientos,{obligacion_id:a.obligacionId,ocurrencia_id:a.ocurrenciaId,empresa_id:a.empresaId,periodo_key:a.periodo!,completada:true,vigente:true,evidencia_url:null}]}))}/>
    {(history||task)&&<Dialog open onOpenChange={()=>{setHistory(null);setTask(null);}}><DialogContent><DialogTitle>{history?.nombre??task}</DialogTitle><DialogDescription>Registro de ejemplo; no modifica la aplicación publicada.</DialogDescription><Button onClick={()=>{setHistory(null);setTask(null);}}>Cerrar</Button></DialogContent></Dialog>}
  </div></main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
