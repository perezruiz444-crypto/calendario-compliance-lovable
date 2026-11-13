// Navegador aislado, API ficticia en loopback y bloqueo de toda red externa.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const evidenceDir=process.env.CALENDAR_EVIDENCE_DIR||'/tmp/calendar-browser-evidence';
await fs.mkdir(evidenceDir,{recursive:true});
const uid='10000000-0000-4000-8000-000000000002',company='20000000-0000-4000-8000-000000000001';
const oid=n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const cid=n=>`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const base='http://127.0.0.1:5179';
async function setup({deny=false,loseResponse=false}={}){
 const context=await browser.newContext({viewport:{width:1360,height:1050},timezoneId:'America/Mexico_City',acceptDownloads:true});
 await context.routeWebSocket('**/*',socket=>socket.close());
 const calls=[];let uploads=0;
 const companyRow={id:company,razon_social:'Empresa ficticia',rfc:'EJE000000AAA'};
 const obligations=[['Entrega mensual ficticia',1],['Entrega cumplida ficticia',2],['Entrega de diciembre ficticia',3],['Revisión de control ficticia',4]].map(([nombre,n])=>({id:oid(n),empresa_id:company,nombre,categoria:'immex',presentacion:'mensual',activa:true,catalogo_id:null,responsable_id:null,articulos:'Referencia ficticia',descripcion:'Obligación de prueba local',fecha_vencimiento:'2026-01-01',empresas:companyRow}));
 const occurrences=[['2026-11-07',1],['2026-11-10',2],['2026-12-01',3]].map(([date,n])=>({id:cid(n),obligacion_id:oid(n),empresa_id:company,periodo_key:date.slice(0,7),fecha_vencimiento:date,origen_fecha:'heredada',estado:'pendiente',evento_id:null,regla_id:null,obligaciones:obligations.find(o=>o.id===oid(n)),empresas:companyRow}));
 const completions=[{id:'60000000-0000-4000-8000-000000000002',obligacion_id:oid(2),empresa_id:company,ocurrencia_id:cid(2),periodo_key:'2026-11',completada:true,vigente:true,completada_por:uid,created_at:'2026-11-01T12:00:00Z'}];
 const rules=obligations.map((o,n)=>({id:`rule-${n}`,obligacion_id:o.id,catalogo_id:null,clasificacion_estado:'aprobada',normativa_estado:'pendiente',tipo_control:n===3?'condicion':'periodica',version:1,aplicabilidad:{},parametros:{}}));
 const reviews=[{id:'70000000-0000-4000-8000-000000000004',obligacion_id:oid(4),empresa_id:company,revisada_en:'2026-11-01T12:00:00Z',proxima_revision:'2026-11-08',resultado:'verificada'}];
 const user={id:uid,email:'cliente@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-01T12:00:00Z'};
 const exp=Date.parse('2026-11-05T12:00:00Z')/1000;
 const token=[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp})).toString('base64url'),'fixture'].join('.');
 await context.addInitScript(({token,user,exp,company})=>{localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_in:86400,expires_at:exp,token_type:'bearer',user}));localStorage.setItem('selectedEmpresaId',company);},{token,user,exp,company});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname!=='127.0.0.1')return route.abort();
  if(url.port==='5179')return route.continue();
  if(url.port!=='54321')return route.abort();
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data),headers:{'Access-Control-Allow-Origin':'*'}});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  const table=url.pathname.split('/').pop();calls.push({table,method:req.method(),body:req.postData(),query:url.search});
  if(url.pathname.includes('/auth/v1/'))return json({user});
  if(url.pathname.includes('/storage/v1/object/')){uploads++;assert.ok(url.pathname.includes(company));return json({Key:'fixture'});}
  if(table==='get_my_role')return json('cliente');
  if(table==='obligacion_v2_puede_registrar')return json(!deny);
  if(table==='asegurar_horizonte_calendario')return json(0);
  if(table==='dias_recordatorio_calendario')return json([{empresa_id:company,tipo:'immex',dias_antes:[7,15]}]);
  if(table==='registrar_cumplimiento_obligacion'){
   const body=JSON.parse(req.postData());assert.equal(body.p_obligacion_id,oid(1));assert.equal(body.p_ocurrencia_id,cid(1));assert.equal(body.p_periodo_key,'2026-11');assert.equal(body.p_notas,'Folio PRUEBA-001');assert.ok(body.p_evidencia_path.startsWith(`${company}/${oid(1)}/2026-11/`));
   if(!completions.some(c=>c.ocurrencia_id===cid(1)))completions.push({id:'60000000-0000-4000-8000-000000000001',obligacion_id:oid(1),empresa_id:company,ocurrencia_id:cid(1),periodo_key:'2026-11',completada:true,vigente:true,completada_por:uid,notas:body.p_notas,evidencia_url:body.p_evidencia_path,created_at:'2026-11-04T18:00:00Z'});
   if(loseResponse){loseResponse=false;return json({message:'Respuesta perdida después de guardar'},503);}return json('60000000-0000-4000-8000-000000000001');
  }
  if(url.pathname.includes('/rpc/'))return json(null);
  let rows=table==='profiles'?[{id:uid,empresa_id:company,nombre_completo:'Persona ficticia',notificaciones_activas:false}]:table==='empresas'?[companyRow]:table==='obligaciones'?obligations:table==='obligacion_ocurrencias'?occurrences:table==='obligacion_cumplimientos'?completions:table==='obligacion_reglas'?rules:table==='obligacion_revisiones'?reviews:[];
  for(const [key,value] of url.searchParams){
   if(value.startsWith('eq.'))rows=rows.filter(row=>String(key==='obligaciones.activa'?row.obligaciones?.activa:row[key])===value.slice(3));
   if(value.startsWith('in.')){const ids=value.slice(4,-1).split(',');rows=rows.filter(row=>ids.includes(String(row[key])));}
  }
  // FullCalendar carga la unión de la vista abierta y los próximos 30 días.
  const ranges=url.searchParams.get('or');if(ranges)rows=rows.filter(row=>{
   return [...ranges.matchAll(/and\(fecha_vencimiento.gte.([\d-]+),fecha_vencimiento.(lt|lte).([\d-]+)\)/g)].some(([,start,op,end])=>row.fecha_vencimiento>=start&&(op==='lt'?row.fecha_vencimiento<end:row.fecha_vencimiento<=end));
  });
  const range=req.headers().range;if(range){const [from,to]=range.split('-').map(Number);rows=rows.slice(from,to+1);}
  else {const offset=Number(url.searchParams.get('offset')??0),limit=Number(url.searchParams.get('limit')??1000);rows=rows.slice(offset,offset+limit);}
  return json((req.headers().accept??'').includes('application/vnd.pgrst.object+json')?rows[0]??null:rows);
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date('2026-11-04T18:00:00Z'));
 await page.goto(`${base}/calendario`);
 await page.locator('.fc-dayGridMonth-view').waitFor();
 await page.locator('.fc-event').filter({hasText:'Entrega mensual ficticia'}).first().waitFor();
 await page.waitForTimeout(650); // termina la transición de entrada antes de capturar evidencia
 return {context,page,calls,completions,errors,get uploads(){return uploads;}};
}
try{
 const app=await setup({loseResponse:true});const {page}=app;
 assert.ok(await page.locator('.fc-toolbar-title').innerText().then(t=>t.toLowerCase().includes('noviembre')));
 await page.screenshot({path:`${evidenceDir}/calendario-mes.png`,fullPage:true});
 const event=title=>page.locator('.fc-event').filter({hasText:title}).first();
 assert.equal(await event('Entrega cumplida ficticia').count(),1);
 await page.getByRole('button',{name:'Ocultar cumplidas',exact:true}).click();
 await event('Entrega cumplida ficticia').waitFor({state:'hidden'});
 await event('Entrega mensual ficticia').click();
 const sheet=page.getByRole('dialog');
 await sheet.getByRole('heading',{name:'Entrega mensual ficticia'}).waitFor();
 await sheet.getByText('Cae en fin de semana',{exact:true}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/calendario');
 await sheet.getByLabel('Folio y notas (opcional)').fill('Folio PRUEBA-001');
 await sheet.getByLabel('Archivo de evidencia (opcional)').setInputFiles({name:'evidencia.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nFixture')});
 await page.screenshot({path:`${evidenceDir}/calendario-panel.png`,fullPage:true});
 await sheet.getByRole('button',{name:'Marcar como cumplida'}).click();
 await page.getByText('Error al guardar: Respuesta perdida después de guardar',{exact:false}).first().waitFor();
 await sheet.getByRole('button',{name:'Marcar como cumplida'}).click();
 await sheet.getByRole('button',{name:'Desmarcar cumplimiento'}).waitFor();
 assert.equal(app.uploads,1,'Un reintento no sube otra copia de la evidencia');
 assert.equal(app.completions.filter(c=>c.ocurrencia_id===cid(1)).length,1,'Un reintento no duplica el cumplimiento');
 await sheet.getByRole('button',{name:'Close',exact:true}).click();
 await event('Entrega mensual ficticia').waitFor({state:'hidden'});
 assert.ok((await page.locator('.fc-toolbar-title').innerText()).toLowerCase().includes('noviembre'));
 // Las revisiones virtuales no deben completar una ocurrencia antigua de la condición.
 await event('Revisión interna: Revisión de control ficticia').click();
 await sheet.getByRole('button',{name:'Registrar revisión',exact:true}).waitFor();
 assert.equal(await sheet.getByRole('button',{name:'Marcar como cumplida'}).count(),0);
 await sheet.getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/calendario');
 await page.locator('.fc-next-button').click();
 await event('Entrega de diciembre ficticia').waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar .ics',exact:true}).click();
 const result=await download;const text=await fs.readFile(await result.path(),'utf8');
 assert.ok(text.includes('SUMMARY:Entrega de diciembre ficticia'));
 assert.ok(!text.includes('Entrega cumplida ficticia'));
 assert.ok(!text.includes('Entrega mensual ficticia'));
 assert.ok(text.includes('DTSTART;VALUE=DATE:20261201'));
 assert.ok(text.includes('TRIGGER:-P7D')&&text.includes('TRIGGER:-P15D'));
 await result.saveAs(`${evidenceDir}/obligaciones-pendientes.ics`);
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>{const table=document.querySelector('.fc-daygrid-body table');return table&&table.getBoundingClientRect().width<350;});
 await page.screenshot({path:`${evidenceDir}/calendario-movil.png`,fullPage:true});
 const controls=await page.locator('.fc-header-toolbar .fc-toolbar-chunk').evaluateAll(elements=>elements.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})));
 assert.ok(controls.every(rect=>rect.left>=0&&rect.right<=390),'La barra del calendario cabe en móvil');
 assert.deepEqual(app.errors,[]);
 await app.context.close();
 const denied=await setup({deny:true});
 await denied.page.locator('.fc-event').filter({hasText:'Entrega mensual ficticia'}).first().click();
 await denied.page.getByText('Solo consulta: no tienes permiso para registrar en esta obligación.').waitFor();
 assert.equal(await denied.page.getByRole('button',{name:'Marcar como cumplida'}).count(),0);
 await denied.context.close();
 console.log(`PASS: mes inicial, filtro de cumplidas, panel V2 sin navegación, evidencia/reintento, revisión correcta, exportación filtrada con alarmas y permisos. Evidencia: ${evidenceDir}`);
}finally{await browser.close();}
