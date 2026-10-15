import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OverviewData } from './obligationOverviewData';
import { effectiveActionState, summarizePeriod } from './obligationModel';
import { formatDateShort, getPeriodLabel } from './obligaciones';
export function exportObligationOverview(data:OverviewData,hoy:string){
 const doc=new jsPDF({orientation:'landscape'});
 doc.setFontSize(16);doc.text('Seguimiento de obligaciones',14,16);
 doc.setFontSize(10);doc.text(data.empresa.razon_social,14,24);
 const actions=data.acciones.filter(a=>data.secciones.acciones.some(s=>s.id===a.id));
 const summary=summarizePeriod(actions,hoy.slice(0,7));
 doc.text(`Periodo ${hoy.slice(0,7)}: ${summary.cumplidas} de ${summary.total} acciones cumplidas${summary.porcentaje===null?'':` (${summary.porcentaje}%)`}. Condiciones y riesgos no son entregas.`,14,32);
 let firstTable=true;
 const table=(title:string,head:string[],body:string[][])=>{
  const y=firstTable?44:16;if(!firstTable)doc.addPage();firstTable=false;doc.setFontSize(14);doc.text(title,14,y);autoTable(doc,{startY:y+7,head:[head],body,styles:{fontSize:8},theme:'grid'});
 };
 table('Acciones',['Obligación','Programa','Periodo / evento','Fecha','Origen','Estado'],actions.map(a=>{
  const ob=data.obligaciones.find(o=>o.id===a.obligacionId)!;
  return [ob.nombre,ob.programa,a.eventoId?(a.eventoNombre??'Evento registrado'):getPeriodLabel(ob.presentacion,a.periodo??''),a.fecha?formatDateShort(a.fecha):'Sin fecha confirmada',a.origenFecha==='interna'?'Objetivo interno':a.origenFecha==='normativa'&&ob.regla?.normativaValidada?'Límite validado':'Fecha registrada; regla por validar',a.completada?(a.evidenciaPath?'Cumplida con evidencia':'Cumplida sin evidencia'):effectiveActionState(a,hoy)==='vencida'?(a.origenFecha==='interna'?'Objetivo atrasado':ob.regla?.normativaValidada?'Vencida':'Fecha registrada pasada'):'Pendiente'];
 }));
 table('Vigencias',['Documento / autorización','Fecha documental','Renovación registrada'],data.vigencias.map(v=>[v.nombre,v.fecha?formatDateShort(v.fecha):'Sin fecha capturada',v.fechaRenovacion?formatDateShort(v.fechaRenovacion):'Sin fecha capturada']));
 table('Condiciones',['Condición','Última revisión','Resultado','Próxima revisión interna'],data.secciones.condiciones.map(c=>{const ob=data.obligaciones.find(o=>o.id===c.id)!;return[ob.nombre,ob.ultimaRevision?ob.ultimaRevision.revisada_en.slice(0,10):'Sin revisión',ob.ultimaRevision?.resultado??'Sin revisión registrada',ob.ultimaRevision?.proxima_revision??'Sin programar'];}));
 table('Por evento',['Supuesto','Seguimiento'],data.secciones.eventos.map(e=>[data.obligaciones.find(o=>o.id===e.id)!.nombre,`${actions.filter(a=>a.obligacionId===e.id&&a.eventoId).length} eventos con seguimiento`]));
 if(data.secciones.porRevisar.length)table('Por revisar',['Obligación','Situación'],data.secciones.porRevisar.map(o=>[data.obligaciones.find(x=>x.id===o.id)!.nombre,'Clasificación, aplicabilidad o periodos por revisar']));
 doc.save(`seguimiento-obligaciones-${hoy}.pdf`);
}
