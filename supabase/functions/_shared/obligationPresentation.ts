/** Política común a lista, calendario y resumen. Desconocidos conservan seguimiento legado. */
export function includeObligationAction(tipo:string|null|undefined,origen:string|null|undefined,eventoId:string|null|undefined):boolean {
 if(tipo==='riesgo')return false;
 if(tipo==='condicion')return origen==='interna';
 if(tipo==='evento')return !!eventoId;
 if(tipo==='vigencia')return !!eventoId||origen==='interna';
 return true;
}
export function selectObligationType(rules:{obligacion_id:string|null;catalogo_id:string|null;clasificacion_estado:string;tipo_control:string;version:number}[],ob:{id:string;catalogo_id:string|null}):string|null {
 return rules.filter(r=>r.clasificacion_estado==='aprobada'&&(r.obligacion_id===ob.id||(ob.catalogo_id!==null&&r.catalogo_id===ob.catalogo_id)))
  .sort((a,b)=>Number(b.obligacion_id===ob.id)-Number(a.obligacion_id===ob.id)||b.version-a.version)[0]?.tipo_control??null;
}
export function latestScheduledReviews<T extends {id:string;obligacion_id:string;revisada_en:string;proxima_revision:string|null}>(rows:readonly T[]):T[]{
 const latest=new Map<string,T>();
 for(const row of rows){const old=latest.get(row.obligacion_id);if(!old||`${row.revisada_en}:${row.id}`>`${old.revisada_en}:${old.id}`)latest.set(row.obligacion_id,row);}
 return [...latest.values()].filter(row=>row.proxima_revision!==null);
}
