import test from 'node:test';
import assert from 'node:assert/strict';
let adapter={};
try { adapter=await import('../.test-build/src/lib/obligationOverviewData.js'); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
const build=(sources)=>{assert.equal(typeof adapter.buildOverviewData,'function','Adaptador aún no implementado');return adapter.buildOverviewData(sources);};
const parent={id:'o',empresa_id:'a',catalogo_id:'catalog',nombre:'Control inventarios',categoria:'immex',descripcion:null,presentacion:'En todo momento',activa:true,responsable_id:null,responsable_tipo:null};
const occurrence={id:'oc',obligacion_id:'o',empresa_id:'a',periodo_key:'2026-10',fecha_vencimiento:'2026-10-20',estado:'pendiente'};
const rule={id:'r',catalogo_id:'catalog',obligacion_id:null,version:1,tipo_control:'condicion',clasificacion_estado:'aprobada',normativa_estado:'pendiente',aplicabilidad:{}};
const source=(extras={})=>({empresa:{id:'a',razon_social:'Empresa ficticia',cert_iva_ieps_rubro:null},obligaciones:[parent],ocurrencias:[occurrence],cumplimientos:[],reglas:[],revisiones:[],eventos:[],relaciones:[],documentos:[],tareas:[],asignaciones:[],perfiles:[],metadataReady:true,...extras});
test('control sin revisión no se convierte en verificado por un cumplimiento antiguo',()=>{
 const result=build(source({reglas:[rule],cumplimientos:[{ocurrencia_id:'oc',obligacion_id:'o',empresa_id:'a',periodo_key:'2026-10',completada:true,vigente:true,evidencia_url:null}]}));
 assert.equal(result.secciones.condiciones.length,1);
 assert.equal(result.secciones.acciones.length,0);
 assert.equal(result.obligaciones[0].ultimaRevision,null);
});
test('cumplimiento vigente corrige el estado persistido y conserva el archivo',()=>{
 const result=build(source({reglas:[{...rule,tipo_control:'periodica'}],cumplimientos:[{ocurrencia_id:'oc',obligacion_id:'o',empresa_id:'a',periodo_key:'2026-10',completada:true,vigente:true,evidencia_url:'a/o/acuse.pdf'}]}));
 assert.equal(result.acciones[0].completada,true);
 assert.equal(result.acciones[0].evidenciaPath,'a/o/acuse.pdf');
});
test('empresa cruzada nunca se incorpora al resumen',()=>{
 assert.throws(()=>build(source({obligaciones:[{...parent,empresa_id:'b'}]})),/empresa/);
});
test('regla faltante permanece por revisar con su fecha heredada',()=>{
 const result=build(source({metadataReady:false}));
 assert.equal(result.secciones.porRevisar.length,1);
 assert.equal(result.secciones.acciones[0].origenFecha,'heredada');
});
test('versión propuesta nueva no sustituye la clasificación aprobada anterior',()=>{
 const result=build(source({reglas:[rule,{...rule,id:'draft',version:2,tipo_control:'evento',clasificacion_estado:'propuesta'}]}));
 assert.equal(result.obligaciones[0].regla.tipo,'condicion');
});
test('heredar catálogo sigue versiones generales nuevas sin revivir la excepción anterior',()=>{
 const personal={...rule,id:'personal',catalogo_id:null,obligacion_id:'o',version:50,tipo_control:'evento'};
 const inherit={...personal,id:'inherit',version:51,parametros:{heredar_catalogo:true}};
 const result=build(source({reglas:[personal,inherit,{...personal,id:'draft',version:52,clasificacion_estado:'propuesta'},rule,{...rule,id:'new',version:2,tipo_control:'periodica'}]}));
 assert.equal(result.obligaciones[0].regla.tipo,'periodica');
 assert.equal(result.obligaciones[0].catalogoId,'catalog');
});
test('una excepción explícita conserva prioridad sobre versiones generales nuevas',()=>{
 const result=build(source({reglas:[{...rule,version:100},{...rule,id:'exception',catalogo_id:null,obligacion_id:'o',version:1,tipo_control:'evento',parametros:{}}]}));
 assert.equal(result.obligaciones[0].regla.tipo,'evento');
});
test('rubro requerido sin dato provoca revisión de aplicabilidad',()=>{
 const result=build(source({reglas:[{...rule,aplicabilidad:{rubro:['AA']}}]}));
 assert.equal(result.obligaciones[0].aplicable,null);
 assert.equal(result.secciones.porRevisar.length,1);
});
test('evento con ocurrencia aparece una sola vez, sin perder cumplimiento previo del evento',()=>{
 const evt={id:'evt',obligacion_id:'o',empresa_id:'a',tipo_evento:'cambio',fecha_evento:'2026-10-14'};
 const result=build(source({reglas:[{...rule,tipo_control:'evento'}],eventos:[evt],ocurrencias:[{...occurrence,evento_id:'evt'}],cumplimientos:[{obligacion_id:'o',empresa_id:'a',ocurrencia_id:null,evento_id:'evt',periodo_key:'evento:evt',completada:true,vigente:true,evidencia_url:null}]}));
 assert.equal(result.secciones.acciones.length,1);
 assert.equal(result.acciones[0].completada,true);
});
test('vigencia documental conserva renovación capturada, sin calcular un plazo',()=>{
 const result=build(source({empresa:{id:'a',razon_social:'Ejemplo',cert_iva_ieps_rubro:'A',cert_iva_ieps_oficio:'Ejemplo',cert_iva_ieps_fecha_vencimiento:'2026-12-15',cert_iva_ieps_fecha_renovar:null}}));
 assert.equal(result.vigencias[0].fecha,'2026-12-15');
 assert.equal(result.vigencias[0].fechaRenovacion,null);
});
test('periódica sin calendario ni ocurrencias sigue visible para revisión sin inventar fechas',()=>{
 const result=build(source({reglas:[{...rule,tipo_control:'periodica',parametros:{unidad:'habiles',calendario:null}}],ocurrencias:[]}));
 assert.deepEqual(result.secciones.porRevisar.map(o=>o.id),['o']);
 assert.equal(result.secciones.acciones.length,0);
});
test('Matriz de Seguridad conserva vencimiento y renovación exactos capturados',()=>{
 const result=build(source({empresa:{id:'a',razon_social:'Ejemplo',matriz_seguridad_fecha_vencimiento:'2026-10-15',matriz_seguridad_fecha_renovar:'2026-10-01'}}));
 assert.deepEqual(result.vigencias,[{id:'empresa-matriz',nombre:'Matriz de Seguridad',programa:'matriz_seguridad',fecha:'2026-10-15',fechaRenovacion:'2026-10-01'}]);
});
