import { useId, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIA_LABELS, formatDateShort, getPeriodLabel } from '@/lib/obligaciones';
import { classifyObligation, effectiveActionState, summarizePeriod, validDateKey } from '@/lib/obligationModel';
import type { OverviewAction, OverviewData, OverviewObligation, OverviewTask } from '@/lib/obligationOverviewData';
import { ANEXO30_DESCARGOS, ANEXO30_INICIAL } from '@/lib/anexo30';

interface Props {
  data: OverviewData;
  hoy: string;
  canRegister: (obligacion: OverviewObligation, accion: OverviewAction) => boolean;
  onRegister: (accion: OverviewAction) => void;
  onHistory: (obligacion: OverviewObligation) => void;
  onTask: (tarea: OverviewTask) => void;
  busyId?: string | null;
  canManage?: (ob: OverviewObligation) => boolean;
  onRevision?: (ob: OverviewObligation) => void;
  onEvidence?: (path: string) => void;
  onClassify?: (ob: OverviewObligation) => void;
  onEvent?: (ob: OverviewObligation) => void;
  onAnexo30?: (ob: OverviewObligation) => void;
}
const actionPeriod = (a: OverviewAction, ob: OverviewObligation) => a.eventoId ? `${a.eventoNombre??'Evento registrado'}${a.eventoFecha?` · ${formatDateShort(a.eventoFecha)}`:''}` : a.periodo ? getPeriodLabel(ob.presentacion,a.periodo) : 'Sin periodo';
const programaLabel = (programa: string) => programa === 'oea' ? 'OEA' : programa === 'matriz_seguridad' ? 'Matriz de Seguridad' : CATEGORIA_LABELS[programa] ?? programa;

function statusLabel(accion: OverviewAction, ob: OverviewObligation, hoy: string) {
  const state = effectiveActionState(accion, hoy);
  if (state === 'cumplida') return accion.evidenciaPath ? 'Cumplida · evidencia registrada' : 'Cumplida sin evidencia';
  if (state === 'vencida') {
    if (accion.origenFecha === 'interna') return 'Revisión atrasada';
    if (accion.origenFecha === 'normativa' && ob.regla?.normativaValidada) return 'Vencida';
    return 'Fecha registrada pasada';
  }
  return accion.fecha ? 'Pendiente' : 'Plazo por determinar';
}
function DateLabel({ accion, ob }: { accion: OverviewAction; ob: OverviewObligation }) {
  const label = accion.origenFecha === 'interna' ? 'Objetivo interno' : accion.origenFecha === 'normativa' && ob.regla?.normativaValidada ? 'Límite' : 'Fecha registrada';
  return <p className="text-xs text-muted-foreground mt-1">
    {validDateKey(accion.fecha) ? `${label}: ${formatDateShort(accion.fecha)}` : 'Sin fecha confirmada'}
    {accion.origenFecha !== 'interna' && !ob.regla?.normativaValidada ? ' · Regla por validar' : ''}
    {accion.objetivoInterno ? ` · Objetivo interno: ${formatDateShort(accion.objetivoInterno)}` : ''}
  </p>;
}
function Metadata({ ob }: { ob: OverviewObligation }) {
  return <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
    <span>{programaLabel(ob.programa)}</span><span>{ob.responsable ?? 'Responsable sin asignar'}</span>
    {ob.asignadaAMi && <span className="text-foreground">Asignada a ti</span>}
  </p>;
}
function References({ ob, onEvidence }: { ob: OverviewObligation; onEvidence?: (path:string)=>void }) {
  return <div className="text-sm space-y-2 py-3">
    {ob.revisiones.length>0&&<div className="space-y-2"><p className="font-medium">Revisiones registradas</p>{ob.revisiones.map(r=><p key={r.id} className="text-xs text-muted-foreground">{r.revisada_en.slice(0,10)} · {r.resultado==='verificada'?'Verificada':r.resultado==='no_aplica'?'No aplica':'Requiere atención'}{r.notas?` · ${r.notas}`:''}{r.evidencia_path&&onEvidence&&<Button size="sm" variant="link" onClick={()=>onEvidence(r.evidencia_path!)}>Ver evidencia</Button>}</p>)}</div>}
    {ob.descripcion && <p className="text-muted-foreground whitespace-pre-line">{ob.descripcion}</p>}
    {ob.riesgos.length > 0 && <p><span className="font-medium">Riesgos relacionados:</span> {ob.riesgos.join(' · ')}</p>}
    {ob.cumplimientosDirectos.length > 0 && <p className="text-xs text-muted-foreground">Hay {ob.cumplimientosDirectos.length} registros de cumplimiento anteriores sin ocurrencia. Se conservan en el historial.</p>}
  </div>;
}

export function ObligacionesOverview({ data, hoy, canRegister, onRegister, onHistory, onTask, busyId, canManage, onRevision, onEvent, onClassify, onEvidence, onAnexo30 }: Props) {
  const instance = useId();
  const [programa, setPrograma] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState('acciones');
  const query = busqueda.trim().toLocaleLowerCase('es-MX');
  const matches = (ob: OverviewObligation) => (programa === 'todos' || ob.programa === programa) && (!query || ob.nombre.toLocaleLowerCase('es-MX').includes(query));
  const visibles = data.obligaciones.filter(matches);
  const ids = new Set(visibles.map(ob => ob.id));
  const selectedActionIds = new Set(data.secciones.acciones.map(a => a.id));
  const actions = data.acciones.filter(a => ids.has(a.obligacionId) && selectedActionIds.has(a.id));
  const conditions = data.secciones.condiciones.filter(ob => ids.has(ob.id)).map(o => visibles.find(ob => ob.id === o.id)!);
  const events = data.secciones.eventos.filter(ob => ids.has(ob.id)).map(o => visibles.find(ob => ob.id === o.id)!);
  const review = data.secciones.porRevisar.filter(ob => ids.has(ob.id)).map(o => visibles.find(ob => ob.id === o.id)!);
  const vigencias = data.vigencias.filter(v => (programa === 'todos' || v.programa === programa) && (!query || v.nombre.toLocaleLowerCase('es-MX').includes(query)));
  const validityRules = data.secciones.vigencias.filter(ob => ids.has(ob.id)).map(o => visibles.find(ob => ob.id === o.id)!);
  const tasks = data.tareas.filter(t => t.estado !== 'completada' && (programa === 'todos' || programa === 'general') && (!query || t.titulo.toLocaleLowerCase('es-MX').includes(query)));
  const upcomingEnd = useMemo(() => {
    const date = new Date(`${hoy}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 30); return date.toISOString().slice(0, 10);
  }, [hoy]);
  const pending = actions.filter(a => !a.completada);
  const readyCount = pending.filter(a => !validDateKey(a.fecha) || a.fecha <= upcomingEnd).length;
  const summary = summarizePeriod(actions, hoy.slice(0, 7));
  const needingReview = conditions.filter(ob => !ob.ultimaRevision || ob.ultimaRevision.resultado === 'requiere_atencion').length;
  const programs = [...new Set([...data.obligaciones.map(o => o.programa), ...data.vigencias.map(v => v.programa), ...(data.tareas.length ? ['general'] : [])])].sort();
  const groups = visibles.map(ob => ({ ob, pendientes: pending.filter(a => a.obligacionId === ob.id).sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '') || a.id.localeCompare(b.id)) })).filter(g => g.pendientes.length);
  const currentGroups = groups.filter(g => g.pendientes.some(a => !validDateKey(a.fecha) || a.fecha <= upcomingEnd));
  const laterGroups = groups.filter(g => !currentGroups.includes(g));
  const completed = actions.filter(a => a.completada);
  const renderGroup = ({ ob, pendientes }: typeof groups[number]) => {
    const primary = pendientes[0];
    return <article className="border-b last:border-b-0 py-5" key={ob.id}>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
        <div className="min-w-0"><h3 className="font-body font-medium text-base break-words">{ob.nombre}</h3><Metadata ob={ob} /></div>
        <span className={`text-xs font-medium shrink-0 ${effectiveActionState(primary,hoy) === 'vencida' ? 'text-warning' : 'text-muted-foreground'}`}>{statusLabel(primary,ob,hoy)}</span>
      </div>
      {onClassify&&<Button size="sm" variant="ghost" onClick={()=>onClassify(ob)}>Cambiar clasificación</Button>}
      <DateLabel accion={primary} ob={ob} />
      {primary.periodo && <p className="text-xs text-muted-foreground mt-1">Periodo registrado: {actionPeriod(primary,ob)}</p>}
      <details className="mt-3 group"><summary className="text-xs text-muted-foreground cursor-pointer min-h-8 flex items-center gap-1"><ChevronDown className="h-3 w-3" />Detalle y periodos ({pendientes.length})</summary>
        <References ob={ob} onEvidence={onEvidence} />
        <div className="divide-y">{pendientes.map(accion => <div key={accion.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
          <div className="min-w-0"><p className="text-sm">{accion.periodo ? actionPeriod(accion,ob) : 'Acción sin periodo'}</p><DateLabel accion={accion} ob={ob} /></div>
          {canRegister(ob,accion) && <Button size="sm" variant="outline" disabled={busyId === accion.id} onClick={() => onRegister(accion)}>{busyId === accion.id ? 'Comprobando permiso…' : 'Registrar cumplimiento'}</Button>}
        </div>)}</div>
        <Button size="sm" variant="ghost" onClick={() => onHistory(ob)}>Ver historial completo</Button>
      </details>
      {ob.regla?.tipo==='condicion'&&canManage?.(ob)&&onRevision&&<Button size="sm" className="mt-3" onClick={()=>onRevision(ob)}>Registrar revisión</Button>}
      {canRegister(ob,primary) && <Button className="mt-3" size="sm" disabled={busyId === primary.id} onClick={() => onRegister(primary)}>{busyId === primary.id ? 'Comprobando permiso…' : 'Registrar cumplimiento'}</Button>}
    </article>;
  };
  return <section aria-label="Obligaciones organizadas" className="bg-card border rounded-lg">
    <header className="p-5 sm:p-6 border-b">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"><h2 className="font-heading text-xl font-semibold normal-case">Obligaciones</h2><span className="text-xs text-muted-foreground">{data.empresa.razon_social}</span></div>
      <p className="text-sm text-muted-foreground mt-2" aria-live="polite">Acciones por atender: {readyCount} · Tareas abiertas: {tasks.length} · Condiciones por revisar: {needingReview}</p>
      {review.length > 0 && <p className="text-xs text-warning mt-2 flex items-start gap-2"><AlertCircle className="h-4 w-4 shrink-0" />Hay {review.length} obligaciones con datos por revisar. Sus fechas registradas siguen visibles.</p>}
    </header>
    <div className="p-5 sm:p-6 space-y-5">
      <div className="grid sm:grid-cols-[1fr_200px] gap-3">
        <div><label htmlFor={`${instance}-buscar`} className="text-xs text-muted-foreground block mb-1">Buscar</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" id={`${instance}-buscar`} value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Nombre de la obligación" /></div></div>
        <div><label htmlFor={`${instance}-programa`} className="text-xs text-muted-foreground block mb-1">Programa</label><Select value={programa} onValueChange={setPrograma}><SelectTrigger id={`${instance}-programa`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los programas</SelectItem>{programs.map(p=><SelectItem key={p} value={p}>{programaLabel(p)}</SelectItem>)}</SelectContent></Select></div>
      </div>
      {onAnexo30 && visibles.filter(ob => ob.activa && ob.aplicable !== false && (ob.catalogoId === ANEXO30_DESCARGOS || ob.catalogoId === ANEXO30_INICIAL)).map(ob => <div className="rounded-md border p-4 space-y-2" key={`calendario-${ob.id}`}><p className="font-medium">{ob.nombre}</p><p className="text-sm text-muted-foreground">{ob.catalogoId === ANEXO30_INICIAL ? 'Calcula treinta días naturales desde el inicio real de vigencia.' : 'Selecciona el mes o bimestre de operaciones para calcular su plazo de presentación.'}</p><Button variant="outline" size="sm" onClick={() => onAnexo30(ob)}>Calcular plazo</Button></div>)}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-1">
          <TabsTrigger className="min-h-11" value="acciones">Acciones</TabsTrigger><TabsTrigger className="min-h-11" value="vigencias">Vigencias</TabsTrigger><TabsTrigger className="min-h-11" value="condiciones">Condiciones</TabsTrigger><TabsTrigger className="min-h-11" value="eventos">Por evento</TabsTrigger>
        </TabsList>
        <TabsContent value="acciones" className="pt-3">
          {summary.total > 0 && <p className="text-xs text-muted-foreground pb-2">Periodo {getPeriodLabel(null,hoy.slice(0,7))}: {summary.cumplidas} de {summary.total} acciones cumplidas ({summary.porcentaje}%). Condiciones y riesgos quedan fuera.</p>}
          {currentGroups.length === 0 && <p className="text-sm text-muted-foreground py-5">No hay acciones de obligaciones por atender en este horizonte.</p>}
          {currentGroups.map(renderGroup)}
          {tasks.length > 0 && <section className="pt-5 border-t"><h3 className="text-sm font-medium">Tareas del equipo</h3>{tasks.map(task=><div key={task.id} className="border-b last:border-0 py-4 flex flex-col sm:flex-row sm:items-center gap-2 justify-between"><div><p className="text-sm">{task.titulo}</p><p className="text-xs text-muted-foreground">Objetivo de tarea: {formatDateShort(task.fecha_vencimiento)}</p></div><Button variant="outline" size="sm" onClick={()=>onTask(task)}>Ver tarea</Button></div>)}</section>}
          {laterGroups.length > 0 && <details className="mt-5 border-t pt-4"><summary className="text-sm text-muted-foreground cursor-pointer min-h-11">Más adelante ({laterGroups.reduce((n,g)=>n+g.pendientes.length,0)})</summary>{laterGroups.map(renderGroup)}</details>}
          {completed.length > 0 && <details className="mt-5 border-t pt-4"><summary className="text-sm text-muted-foreground cursor-pointer min-h-11">Historial de periodos cumplidos ({completed.length})</summary>{completed.map(a=>{
            const ob=visibles.find(o=>o.id===a.obligacionId)!;
            return <div key={a.id} className="py-4 border-b last:border-0"><p className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{ob.nombre}</p><p className="text-xs text-muted-foreground mt-1">{a.periodo ? getPeriodLabel(ob.presentacion,a.periodo) : 'Sin periodo'} · {statusLabel(a,ob,hoy)}</p><Button variant="ghost" size="sm" className="mt-2" onClick={()=>onHistory(ob)}>Ver registro</Button></div>;
          })}</details>}
        </TabsContent>
        <TabsContent value="vigencias" className="pt-3">
          {vigencias.length === 0 && validityRules.length === 0 && <p className="text-sm text-muted-foreground py-5">Sin documentos o autorizaciones de vigencia registrados.</p>}
          {vigencias.map(v=><article key={v.id} className="py-5 border-b last:border-0"><h3 className="font-body font-medium text-base">{v.nombre}</h3><p className="text-xs text-muted-foreground mt-1">{programaLabel(v.programa)}</p><p className="text-sm mt-2">{v.fecha ? `Fecha documental: ${formatDateShort(v.fecha)}` : 'Falta registrar el vencimiento documental'}</p><p className="text-xs text-muted-foreground mt-1">{v.fechaRenovacion ? `Renovación capturada: ${formatDateShort(v.fechaRenovacion)}` : 'Ventana de renovación por confirmar'}</p></article>)}
          {validityRules.map(ob=><article key={ob.id} className="py-4 border-b"><h3 className="text-sm font-medium">{ob.nombre}</h3><Metadata ob={ob}/><details className="mt-2"><summary className="text-xs text-muted-foreground cursor-pointer">Ver requisito asociado</summary><References ob={ob} onEvidence={onEvidence}/></details></article>)}
        </TabsContent>
        <TabsContent value="condiciones" className="pt-3">
          {conditions.length === 0 && <p className="text-sm text-muted-foreground py-5">No hay condiciones permanentes clasificadas para este filtro.</p>}
          {conditions.map(ob=><article key={ob.id} className="py-5 border-b last:border-0"><div className="flex flex-col sm:flex-row gap-2 justify-between"><h3 className="font-body font-medium text-base">{ob.nombre}</h3><span className={`text-xs ${ob.ultimaRevision?.resultado==='verificada'?'text-success':'text-warning'}`}>{!ob.ultimaRevision ? 'Sin revisión registrada' : ob.ultimaRevision.resultado==='verificada' ? 'Verificada' : ob.ultimaRevision.resultado==='no_aplica' ? 'No aplica según revisión' : 'Requiere atención'}</span></div><Metadata ob={ob}/>{onClassify&&<Button size="sm" variant="ghost" onClick={()=>onClassify(ob)}>Cambiar clasificación</Button>}
            {ob.ultimaRevision && <p className="text-xs text-muted-foreground mt-2">Última revisión: {formatDateShort(ob.ultimaRevision.revisada_en)}{ob.ultimaRevision.proxima_revision ? ` · Próxima revisión interna: ${formatDateShort(ob.ultimaRevision.proxima_revision)}` : ''}</p>}
            {canManage?.(ob)&&onRevision&&<Button size="sm" variant="outline" className="mt-3" onClick={()=>onRevision(ob)}>Registrar revisión</Button>}<details className="mt-3"><summary className="text-xs text-muted-foreground cursor-pointer min-h-8">Evidencia y riesgos asociados</summary><References ob={ob} onEvidence={onEvidence}/>{ob.ultimaRevision?.evidencia_path && <p className="text-xs">Evidencia registrada en la revisión</p>}<Button variant="ghost" size="sm" onClick={()=>onHistory(ob)}>Ver historial anterior</Button></details>
          </article>)}
        </TabsContent>
        <TabsContent value="eventos" className="pt-3">
          {events.length === 0 && <p className="text-sm text-muted-foreground py-5">No hay obligaciones por evento clasificadas para este filtro.</p>}
          {events.map(ob=>{const activated=actions.filter(a=>a.obligacionId===ob.id&&a.eventoId);return <article key={ob.id} className="py-5 border-b last:border-0"><div className="flex flex-col sm:flex-row justify-between gap-2"><h3 className="font-body font-medium text-base">{ob.nombre}</h3><span className="text-xs text-muted-foreground">{activated.length ? `${activated.length} acciones activadas` : 'Sin evento registrado'}</span></div><Metadata ob={ob}/>{onClassify&&<Button size="sm" variant="ghost" onClick={()=>onClassify(ob)}>Cambiar clasificación</Button>}{data.eventos.filter(e=>e.obligacion_id===ob.id&&e.evidencia_path).map(e=><Button key={e.id} variant="link" size="sm" onClick={()=>onEvidence?.(e.evidencia_path!)}>Ver evidencia de {e.tipo_evento}</Button>)}<p className="text-xs text-muted-foreground mt-2">{activated.length ? 'Consulta su seguimiento en Acciones.' : 'El plazo comienza cuando ocurre el supuesto aplicable.'}</p>{canManage?.(ob)&&onEvent&&<Button size="sm" variant="outline" className="mt-3" onClick={()=>onEvent(ob)}>Registrar evento</Button>}<details className="mt-3"><summary className="text-xs text-muted-foreground cursor-pointer min-h-8">Ver supuesto y soporte</summary><References ob={ob} onEvidence={onEvidence}/></details></article>;})}
        </TabsContent>
      </Tabs>
      {review.length > 0 && <details className="border-t pt-4"><summary className="text-sm text-warning cursor-pointer min-h-11">Por revisar ({review.length})</summary>{review.map(ob=><article key={ob.id} className="py-4 border-b last:border-0"><p className="font-medium text-sm">{ob.nombre}</p><Metadata ob={ob}/><p className="text-xs text-muted-foreground mt-1">{classifyObligation(ob.regla)==='por_clasificar'?'Falta aprobar su clasificación':ob.aplicable===null?'Falta confirmar aplicabilidad':'Faltan periodos y fechas para seguimiento'}</p><References ob={ob} onEvidence={onEvidence}/>{onClassify&&<Button variant="outline" size="sm" onClick={()=>onClassify(ob)}>Clasificar</Button>}<Button variant="ghost" size="sm" onClick={()=>onHistory(ob)}>Ver historial</Button></article>)}</details>}
    </div>
  </section>;
}
