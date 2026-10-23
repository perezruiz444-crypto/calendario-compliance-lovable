const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('.superpowers/sdd/plan',{recursive:true});
const fixture=JSON.parse(await fs.readFile('tests/fixtures/obligation-demo.json','utf8'));
const uid='10000000-0000-4000-8000-000000000002';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
async function setup(options={}){
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 // También bloquear Realtime: route HTTP no intercepta conexiones WebSocket.
 await context.routeWebSocket('**/*',socket=>socket.close());
 const source=structuredClone(fixture);
 const state={failRules:false,deny:false,noCompany:false,...options};
 const calls=[];
 const user={id:uid,email:'cliente@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{nombre_completo:'Ana ficticia'},created_at:'2026-10-14T12:00:00Z'};
 const payload={sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600};
 const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url'),'fixture-no-signature'].join('.');
 await context.addInitScript(({token,user,empresaId,simulatedRole})=>{
  if(simulatedRole)sessionStorage.setItem('simulated_role',simulatedRole);
  if(empresaId)localStorage.setItem('selectedEmpresaId',empresaId);
  localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}));
 },{token,user,empresaId:state.role==='administrador'?source.empresa.id:null,simulatedRole:state.simulatedRole});
 await context.route('**/*',async route=>{
  const request=route.request();const url=new URL(request.url());
  if(url.hostname!=='127.0.0.1'){if(url.hostname.endsWith('supabase.co'))throw new Error('Intento de acceso remoto');return route.abort();}
  if(url.port==='5179')return route.continue();
  if(url.port!=='54321')return route.abort();
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':'*'}});
  const method=request.method(); const table=url.pathname.split('/').pop();calls.push({method,table,query:url.search});
  if(method==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  if(url.pathname.includes('/auth/v1/'))return json({user});
  if(url.pathname.includes('/rpc/get_my_role'))return json(state.role??'cliente');
  if(url.pathname.includes('/rpc/obligacion_v2_puede_registrar'))return json(!state.deny);
  if(url.pathname.includes('/rpc/registrar_revision_obligacion')){
   const body=JSON.parse(request.postData());
   if(state.failTracking)return json({message:'No se guardó la revisión'},503);
   assert.ok(source.obligaciones.some(o=>o.id===body.p_obligacion_id&&o.empresa_id===source.empresa.id&&o.activa));
   source.revisiones.push({id:'review-new',empresa_id:source.empresa.id,obligacion_id:body.p_obligacion_id,resultado:body.p_resultado,revisada_en:'2026-10-15T14:00:00Z',revisada_por:uid,evidencia_path:body.p_evidencia_path??null,notas:body.p_notas??null,proxima_revision:body.p_proxima_revision??null});return json('review-new');
  }
  if(url.pathname.includes('/rpc/registrar_evento_obligacion')){
   const body=JSON.parse(request.postData());
   if(state.failTracking)return json({message:'No se guardó el evento'},503);
   assert.ok(source.obligaciones.some(o=>o.id===body.p_obligacion_id&&o.empresa_id===source.empresa.id&&o.activa));
   let event=source.eventos.find(e=>e.idempotency_key===body.p_idempotency_key);
   if(!event){event={id:'70000000-0000-4000-8000-000000000001',empresa_id:source.empresa.id,obligacion_id:body.p_obligacion_id,tipo_evento:body.p_tipo_evento,fecha_evento:body.p_fecha_evento,idempotency_key:body.p_idempotency_key};source.eventos.push(event);}return json(event.id);
  }
  if(url.pathname.includes('/rpc/registrar_cumplimiento_obligacion')){
   const body=JSON.parse(request.postData());
   assert.ok(source.obligaciones.some(o=>o.id===body.p_obligacion_id&&o.empresa_id===source.empresa.id&&o.activa));
   if(body.p_evento_id)assert.ok(source.eventos.some(e=>e.id===body.p_evento_id&&e.obligacion_id===body.p_obligacion_id));
   if(body.p_ocurrencia_id)assert.ok(source.ocurrencias.some(o=>o.id===body.p_ocurrencia_id&&o.obligacion_id===body.p_obligacion_id&&o.periodo_key===body.p_periodo_key));
   const old=source.cumplimientos.find(c=>c.obligacion_id===body.p_obligacion_id&&c.periodo_key===body.p_periodo_key&&c.vigente);
   let row=old;
   if(!old?.completada){
    if(old)old.vigente=false;
    row={id:`completion-${source.cumplimientos.length}`,obligacion_id:body.p_obligacion_id,empresa_id:source.empresa.id,ocurrencia_id:body.p_ocurrencia_id??null,evento_id:body.p_evento_id??null,periodo_key:body.p_periodo_key,completada:true,vigente:true,completada_por:uid,evidencia_url:body.p_evidencia_path??old?.evidencia_url??null,completada_en:'2026-10-15T16:00:00Z'};
    source.cumplimientos.push(row);if(old)old.reemplazado_por=row.id;
   }
   if(state.loseCompletionResponse){state.loseCompletionResponse=false;return json({message:'Respuesta perdida después de guardar'},503);}
   return json(row.id);
  }
  if(url.pathname.includes('/rpc/'))return json(null);
  if(table==='obligacion_reglas'&&state.failRules)return json({code:'XX000',message:'Fallo de transporte local'},503);
  if(table==='obligacion_reglas'&&method==='POST'){
   const body=JSON.parse(request.postData());
   source.reglas.push({catalogo_id:null,obligacion_id:null,...body,id:`rule-${source.reglas.length}`});
   return json(null,201);
  }
  if(table==='obligaciones'&&method==='POST'){
   const body=JSON.parse(request.postData());assert.equal(body.empresa_id,source.empresa.id);
   const row={...body,id:'40000000-0000-4000-8000-000000000099',responsable_id:null,responsable_tipo:null};source.obligaciones.push(row);return json(row,201);
  }
  if(table==='obligacion_cumplimientos'&&method==='POST'){
   const body=JSON.parse(request.postData());
   if(source.cumplimientos.some(c=>c.obligacion_id===body.obligacion_id&&c.periodo_key===body.periodo_key&&c.vigente))return json({code:'23505',message:'duplicate key value violates unique constraint obligacion_cumplimientos_vigente_unico'},409);
   assert.equal(body.empresa_id,source.empresa.id);assert.ok(source.obligaciones.some(o=>o.id===body.obligacion_id&&o.empresa_id===source.empresa.id&&o.activa));if(body.evento_id)assert.ok(source.eventos.some(e=>e.id===body.evento_id&&e.obligacion_id===body.obligacion_id));else assert.ok(source.ocurrencias.some(o=>o.id===body.ocurrencia_id&&o.obligacion_id===body.obligacion_id));
   source.cumplimientos.push({...body,id:'completion-fixture',vigente:true,completada_en:'2026-10-14T12:00:00Z'});
   return json(null,201);
  }
  if(table==='obligacion_cumplimientos'&&state.failHistory&&url.searchParams.has('obligacion_id'))return json({message:'Historial no disponible'},503);
  const profiles=[{id:uid,nombre_completo:'Ana ficticia',empresa_id:state.noCompany?null:source.empresa.id,email:'cliente@example.invalid'}];
  let rows=table==='obligaciones_catalogo'?(state.catalog??[]):table==='profiles'?profiles:table==='empresas'?[{...source.empresa,rfc:'EJE000000AAA',domicilio_fiscal:'Domicilio ficticio'}]
   :table==='obligaciones'?source.obligaciones:table==='obligacion_ocurrencias'?source.ocurrencias
   :table==='obligacion_cumplimientos'?source.cumplimientos:table==='obligacion_reglas'?source.reglas
   :table==='obligacion_revisiones'?source.revisiones:table==='obligacion_eventos'?source.eventos
   :table==='obligacion_relaciones'?source.relaciones:table==='documentos'?source.documentos:table==='tareas'?source.tareas
   :table==='obligacion_responsables'?source.asignaciones.map((id,i)=>({id:`assignment-${i}`,obligacion_id:id,user_id:uid})):[];
  for(const [key,value] of url.searchParams){if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));}
  if(url.searchParams.get('order')==='version.desc')rows=[...rows].sort((a,b)=>b.version-a.version);
  const offset=Number(url.searchParams.get('offset')??0);const limit=Number(url.searchParams.get('limit')??250);
  rows=rows.slice(offset,offset+limit);
  if((request.headers().accept??'').includes('application/vnd.pgrst.object+json'))return json(rows[0]??null);
  return json(rows);
 });
 const page=await context.newPage();
 page.setDefaultTimeout(8000);
 page.on('pageerror',error=>console.error('Error de página:',error.message));
 return {context,page,state,source,calls};
}
try {
 for(const scope of ['general','empresa','heredar']){
  const shared=await setup({role:'administrador'});
  const obligation=shared.source.obligaciones[1];
  shared.source.reglas=shared.source.reglas.filter(r=>r.catalogo_id!==obligation.catalogo_id);
  await shared.page.goto('http://127.0.0.1:5179/pendientes');
  await shared.page.locator('summary').filter({hasText:'Por revisar'}).click();
  const article=shared.page.locator('article').filter({hasText:obligation.nombre});
  await article.getByRole('button',{name:'Clasificar',exact:true}).click();
  const dialog=shared.page.getByRole('dialog');
  assert.equal(await dialog.getByLabel('Dónde se aplica').inputValue(),'general');
  await dialog.getByLabel('Dónde se aplica').selectOption(scope);
  await dialog.getByRole('button',{name:scope==='general'?'Guardar criterio general':'Guardar clasificación',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  const saved=shared.source.reglas.at(-1);
  assert.equal(saved.catalogo_id,scope==='general'?obligation.catalogo_id:null);
  assert.equal(saved.obligacion_id,scope==='general'?null:obligation.id);
  assert.equal(saved.parametros.heredar_catalogo,scope==='heredar'?true:undefined);
  assert.equal(saved.normativa_estado,'pendiente');
  assert.equal(shared.calls.filter(c=>c.table==='obligacion_cumplimientos'&&c.method==='POST').length,0);
  await shared.context.close();
 }
 const corrected=await setup({loseCompletionResponse:true});
 const target=corrected.source.ocurrencias[0];
 corrected.source.cumplimientos.push({id:'old-false',empresa_id:corrected.source.empresa.id,obligacion_id:target.obligacion_id,ocurrencia_id:target.id,periodo_key:target.periodo_key,completada:false,vigente:true,evidencia_url:null});
 await corrected.page.goto('http://127.0.0.1:5179/pendientes');
 const correctedArticle=corrected.page.locator('article').filter({has:corrected.page.getByRole('heading',{name:'Revisar transmisión de descargos',exact:true})});
 await correctedArticle.getByRole('button',{name:'Registrar cumplimiento',exact:true}).click();
 await corrected.page.getByRole('dialog').getByRole('button',{name:'Sin evidencia',exact:true}).click();
 await corrected.page.getByText('Respuesta perdida después de guardar',{exact:true}).waitFor();
 assert.equal(corrected.source.cumplimientos.filter(c=>c.obligacion_id===target.obligacion_id).length,2);
 await corrected.page.getByRole('dialog').getByRole('button',{name:'Sin evidencia',exact:true}).click();
 await corrected.page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(corrected.source.cumplimientos.filter(c=>c.obligacion_id===target.obligacion_id).length,2);
 assert.ok(corrected.source.cumplimientos.some(c=>c.id==='old-false'&&!c.vigente&&!c.completada&&c.reemplazado_por));
 assert.equal(corrected.source.cumplimientos.filter(c=>c.obligacion_id===target.obligacion_id&&c.vigente&&c.completada).length,1);
 assert.equal(corrected.calls.filter(c=>c.table==='obligacion_cumplimientos'&&c.method==='POST').length,0);
 await corrected.context.close();
 for(const account of [{role:'cliente'},{role:'administrador'},{role:'administrador',simulatedRole:'cliente'}]){
  const own=await setup(account);
  own.source.asignaciones=[];
  own.source.obligaciones.forEach(o=>{o.responsable_id=null;o.responsable_tipo=null;});
  own.source.ocurrencias[0].periodo_key='2026-08';
  own.source.ocurrencias[0].fecha_vencimiento='2026-08-17';
  await own.page.goto('http://127.0.0.1:5179/pendientes');
  const article=own.page.locator('article').filter({has:own.page.getByRole('heading',{name:'Revisar transmisión de descargos',exact:true})});
  await article.getByRole('button',{name:'Registrar cumplimiento',exact:true}).waitFor();
  await article.getByRole('button',{name:'Registrar cumplimiento',exact:true}).click();
  await own.page.getByRole('dialog').getByRole('button',{name:'Sin evidencia',exact:true}).click();
  await own.page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(own.source.cumplimientos.at(-1).periodo_key,'2026-08');
  assert.equal(own.source.cumplimientos.at(-1).ocurrencia_id,own.source.ocurrencias[0].id);
  assert.equal(own.source.cumplimientos.filter(c=>c.periodo_key==='2026-10').length,0);
  await own.page.getByRole('tab',{name:'Condiciones',exact:true}).click();
  await own.page.getByRole('button',{name:'Registrar revisión',exact:true}).first().waitFor();
  await own.context.close();
 }
 const app=await setup();
 await app.page.goto('http://127.0.0.1:5179/pendientes');
 await app.page.getByRole('heading',{name:'Obligaciones',exact:true}).waitFor({timeout:12000});
 assert.equal(await app.page.getByRole('navigation',{name:'Herramientas secundarias'}).count(),1);
 app.state.deny=true;
 await app.page.getByRole('button',{name:'Registrar cumplimiento',exact:true}).first().click();
 await app.page.getByText('No tienes permiso para registrar en esta empresa',{exact:true}).waitFor();
 assert.equal(await app.page.getByRole('dialog').count(),0);
 app.state.deny=false;
 await app.page.getByRole('button',{name:'Registrar cumplimiento',exact:true}).first().click();
 await app.page.getByRole('dialog').waitFor();
 await app.page.getByRole('button',{name:'Sin evidencia',exact:true}).click();
 await app.page.getByText('Historial de periodos cumplidos (2)',{exact:true}).waitFor();
 assert.equal(app.source.cumplimientos.length,2);
 assert.equal(app.source.cumplimientos[1].evidencia_url,null);
 await app.page.screenshot({path:'.superpowers/sdd/plan/app-pendientes.png',fullPage:true});
 await app.context.close();
 const failing=await setup({failRules:true});
 await failing.page.goto('http://127.0.0.1:5179/pendientes');
 await failing.page.getByText('No pudimos cargar las obligaciones de esta empresa.',{exact:true}).waitFor({timeout:12000});
 assert.equal(await failing.page.getByRole('tab',{name:'Acciones',exact:true}).count(),0);
 failing.state.failRules=false;
 await failing.page.getByRole('button',{name:'Reintentar',exact:true}).click();
 await failing.page.getByRole('tab',{name:'Acciones',exact:true}).waitFor();
 await failing.context.close();
 const history=await setup();
 history.source.cumplimientos.push(...Array.from({length:13},(_,i)=>({id:`history-${i}`,obligacion_id:history.source.obligaciones[0].id,empresa_id:history.source.empresa.id,periodo_key:`registro-${i}`,completada:true,vigente:i!==12,completada_en:'2026-10-14T12:00:00Z',evidencia_url:null})));
 await history.page.goto('http://127.0.0.1:5179/pendientes');
 await history.page.locator('summary').filter({hasText:'Detalle y periodos'}).first().click();
 await history.page.getByRole('button',{name:'Ver historial completo',exact:true}).first().click();
 const dialog=history.page.getByRole('dialog');
 await dialog.getByText('registro-12',{exact:true}).waitFor({timeout:5000});
 assert.equal(await dialog.getByText('Registro corregido',{exact:true}).count(),1);
 await history.page.keyboard.press('Escape');
 history.state.failHistory=true;
 await history.page.getByRole('button',{name:'Ver historial completo',exact:true}).first().click();
 await dialog.getByText('No pudimos cargar el historial.',{exact:true}).waitFor();
 assert.equal(await dialog.getByText('Sin historial de cumplimiento',{exact:true}).count(),0);
 history.state.failHistory=false;
 await dialog.getByRole('button',{name:'Reintentar',exact:true}).click();
 await dialog.getByText('registro-12',{exact:true}).waitFor();
 await history.context.close();
 const management=await setup({role:'administrador'});
 const archived={...management.source.obligaciones[1],id:'archived-control',nombre:'Control anterior inactivo',activa:false};
 management.source.obligaciones.push(archived);
 management.source.cumplimientos.push({id:'historic-proof',obligacion_id:archived.id,empresa_id:management.source.empresa.id,periodo_key:'2024',completada:true,vigente:true,completada_en:'2024-12-01T12:00:00Z',evidencia_url:null});
 await management.page.goto(`http://127.0.0.1:5179/empresas/${management.source.empresa.id}`);
 const inventory=management.page.getByRole('region',{name:'Configuración e historial de obligaciones',exact:true});
 await inventory.getByText('Condición permanente',{exact:true}).first().waitFor();
 assert.equal(await inventory.getByRole('checkbox').count(),0);
 assert.equal(await inventory.getByText('Control anterior inactivo',{exact:true}).count(),0);
 const controlRow=inventory.getByRole('row').filter({hasText:'Control de inventarios Anexo 24'});
 assert.match(await controlRow.innerText(),/Condición permanente/i);
 assert.doesNotMatch(await controlRow.innerText(),/Vencid|Pendiente|Cumplida/);
 const pdfDownload=management.page.waitForEvent('download');
 await inventory.getByRole('button',{name:'PDF',exact:true}).click();
 await (await pdfDownload).saveAs('/tmp/obligaciones-inventario-ejemplo.pdf');
 await inventory.getByRole('combobox',{name:'Estado de los registros'}).click();
 await management.page.getByRole('option',{name:'Solo inactivas',exact:true}).click();
 await inventory.getByRole('button',{name:archived.nombre,exact:true}).waitFor();
 assert.equal(await inventory.getByRole('button',{name:'Control de inventarios Anexo 24',exact:true}).count(),0);
 await inventory.getByRole('button',{name:archived.nombre,exact:true}).click();
 await management.page.getByRole('dialog').getByText('Año 2024',{exact:true}).waitFor();
 await management.page.keyboard.press('Escape');
 await inventory.getByRole('combobox',{name:'Estado de los registros'}).click();
 await management.page.getByRole('option',{name:'Solo activas',exact:true}).click();
 await management.page.getByText('Inventario PDF generado',{exact:true}).waitFor({state:'hidden'});
 await inventory.screenshot({path:'/tmp/obligaciones-inventario-ejemplo.png'});
 assert.equal(management.calls.filter(c=>c.method!=='GET'&&c.method!=='OPTIONS'&&/^(obligaciones|obligacion_cumplimientos|registrar_|corregir_)/.test(c.table)).length,0);
 await management.context.close();
 const activation=await setup({role:'administrador',catalog:[{id:'30000000-0000-4000-8000-000000000099',programa:'general',categoria:'general',nombre:'Control sintético nuevo',descripcion:'Solo prueba local de refresco',presentacion:'Mensual',frecuencia_tipo:'MENSUAL',dia_vencimiento:20,obligatorio:false,activo:true}]});
 await activation.page.goto(`http://127.0.0.1:5179/empresas/${activation.source.empresa.id}`);
 await activation.page.locator('#catalogo-activacion-section').getByRole('button',{name:'Activar',exact:true}).first().click();
 await activation.page.getByRole('dialog').getByRole('button',{name:/^Activar y generar/}).click();
 await activation.page.getByRole('region',{name:'Obligaciones organizadas',exact:true}).getByText('Control sintético nuevo',{exact:true}).waitFor({state:'attached',timeout:5000});
 assert.ok(activation.calls.some(c=>c.table==='obligaciones'&&c.method==='POST'));
 await activation.context.close();
 const tracking=await setup();
 tracking.source.asignaciones.push(tracking.source.obligaciones[2].id);
 await tracking.page.goto('http://127.0.0.1:5179/pendientes');
 await tracking.page.getByRole('tab',{name:'Condiciones',exact:true}).click();
 await tracking.page.getByRole('button',{name:'Registrar revisión',exact:true}).first().click();
 const reviewDialog=tracking.page.getByRole('dialog');
 await reviewDialog.getByLabel('Resultado',{exact:true}).selectOption('requiere_atencion');
 await reviewDialog.getByLabel('Próxima revisión interna (opcional)',{exact:true}).fill('2026-10-16');
 await reviewDialog.getByLabel('Notas o motivo',{exact:true}).fill('Falta actualizar soporte ficticio');
 tracking.state.failTracking=true;
 await reviewDialog.getByRole('button',{name:'Guardar',exact:true}).click();
 await reviewDialog.getByRole('alert').waitFor();
 assert.equal(tracking.source.revisiones.length,1);
 tracking.state.failTracking=false;
 await reviewDialog.getByRole('button',{name:'Reintentar',exact:true}).click();
 await tracking.page.getByText('Requiere atención',{exact:true}).first().waitFor();
 assert.equal(tracking.source.revisiones.length,2);
 await tracking.page.getByRole('tab',{name:'Por evento',exact:true}).click();
 await tracking.page.getByRole('button',{name:'Registrar evento',exact:true}).click();
 const eventDialog=tracking.page.getByRole('dialog');
 await eventDialog.getByLabel('Qué ocurrió',{exact:true}).fill('Cambio de inmueble ficticio');
 await eventDialog.getByRole('button',{name:'Guardar',exact:true}).click();
 await tracking.page.getByText('1 acciones activadas',{exact:true}).waitFor();
 assert.equal(tracking.source.eventos.length,1);
 await tracking.page.getByRole('tab',{name:'Acciones',exact:true}).click();
 const eventArticle=tracking.page.locator('article').filter({has:tracking.page.getByRole('heading',{name:'Cambio en documento del inmueble',exact:true})});
 await eventArticle.getByRole('button',{name:'Registrar cumplimiento',exact:true}).click();
 await tracking.page.getByRole('dialog').getByRole('button',{name:'Sin evidencia',exact:true}).click();
 await tracking.page.getByRole('dialog').waitFor({state:'hidden'});
 assert.equal(tracking.source.cumplimientos.at(-1).evento_id,'70000000-0000-4000-8000-000000000001');
 assert.equal(tracking.source.cumplimientos.at(-1).ocurrencia_id,null);
 const downloaded=tracking.page.waitForEvent('download');
 await tracking.page.getByRole('button',{name:'Exportar PDF',exact:true}).click();
 assert.match((await downloaded).suggestedFilename(),/^seguimiento-obligaciones-/);
 await tracking.page.goto('http://127.0.0.1:5179/calendario');
 await tracking.page.getByText('Revisión interna: Control de inventarios Anexo 24',{exact:false}).first().waitFor();
 await tracking.context.close();
 const empty=await setup({noCompany:true});
 await empty.page.goto('http://127.0.0.1:5179/pendientes');
 await empty.page.getByRole('heading',{name:'Tu empresa todavía no está asignada',exact:true}).waitFor({timeout:12000});
 assert.ok(!empty.calls.some(c=>c.table==='obligaciones'),JSON.stringify(empty.calls));
 await empty.context.close();
 console.log('PASS: ruta autenticada con transporte local simulado, permiso denegado antes de diálogo/escritura, entrega conserva periodo y empresa, sin evidencia honesta, historial >12 con correcciones y recuperación de error, error sin falso cero + reintento, catálogo refresca overview sin recarga, cliente sin empresa sin lecturas de obligaciones. No acredita Auth/Storage reales.');
}finally{await browser.close()}
