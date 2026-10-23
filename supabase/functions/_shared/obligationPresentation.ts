/** Política común a lista, calendario y resumen. Desconocidos conservan seguimiento legado. */
export function includeObligationAction(tipo:string|null|undefined,origen:string|null|undefined,eventoId:string|null|undefined):boolean {
 if(tipo==='riesgo')return false;
 if(tipo==='condicion')return origen==='interna';
 if(tipo==='evento')return !!eventoId;
 if(tipo==='vigencia')return !!eventoId||origen==='interna';
 return true;
}
type RuleSelection = {obligacion_id:string|null;catalogo_id:string|null;clasificacion_estado:string;tipo_control:string;version:number;parametros?:unknown};
export function selectObligationRule<T extends RuleSelection>(rules:readonly T[],ob:{id:string;catalogo_id:string|null}):T|null {
 const approved=rules.filter(r=>r.clasificacion_estado==='aprobada');
 const particular=approved.filter(r=>r.obligacion_id===ob.id).sort((a,b)=>b.version-a.version)[0];
 const params=particular?.parametros;
 const inherits=params!==null&&typeof params==='object'&&!Array.isArray(params)&&'heredar_catalogo' in params&&params.heredar_catalogo===true;
 if(particular&&!inherits)return particular;
 return approved.filter(r=>ob.catalogo_id!==null&&r.catalogo_id===ob.catalogo_id).sort((a,b)=>b.version-a.version)[0]??null;
}
export function selectObligationType(rules:readonly RuleSelection[],ob:{id:string;catalogo_id:string|null}):string|null {
 return selectObligationRule(rules,ob)?.tipo_control??null;
}
export function latestScheduledReviews<T extends {id:string;obligacion_id:string;revisada_en:string;proxima_revision:string|null}>(rows:readonly T[]):T[]{
 const latest=new Map<string,T>();
 for(const row of rows){const old=latest.get(row.obligacion_id);if(!old||`${row.revisada_en}:${row.id}`>`${old.revisada_en}:${old.id}`)latest.set(row.obligacion_id,row);}
 return [...latest.values()].filter(row=>row.proxima_revision!==null);
}

/** Una fecha heredada no demuestra un vencimiento legal. No cambiar el dato para ocultar el aviso. */
export function includeClientReminder(
  occurrence: { origen_fecha: string | null; regla_id: string | null },
  rules: readonly { id: string; clasificacion_estado: string; normativa_estado: string }[],
): boolean {
  if (occurrence.origen_fecha === 'interna') return true;
  return occurrence.origen_fecha === 'normativa' && rules.some(rule =>
    rule.id === occurrence.regla_id && rule.clasificacion_estado === 'aprobada' && rule.normativa_estado === 'validada');
}
