// Exclusivamente contrato local sintético. Dos conexiones PostgreSQL reales.
import {execFile,execFileSync,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
const binary=process.env.PSQL_BINARY||'psql';
const args=['-X','-w','-h','127.0.0.1','-p','55439','-U','postgres','-d','calendario_obligaciones_test','-v','ON_ERROR_STOP=1','-At'];
const env={PATH:process.env.PATH,LANG:'C',PGPASSFILE:'/dev/null'};
const run=sql=>execFileSync(binary,[...args,'-c',sql],{env,encoding:'utf8'}).trim();
assert.equal(run("SELECT current_database()||'|'||inet_server_port()||'|'||(SELECT razon_social FROM public.empresas WHERE id='20000000-0000-4000-8000-000000000001')"),'calendario_obligaciones_test|55439|Empresa A ficticia');
const ob='40000000-0000-4000-8000-000000000099';
const oc='50000000-0000-4000-8000-000000000099';
const uid='10000000-0000-4000-8000-000000000002';
const cleanup=`DELETE FROM public.obligacion_cumplimientos WHERE obligacion_id='${ob}';DELETE FROM public.obligacion_ocurrencias WHERE obligacion_id='${ob}';DELETE FROM public.obligaciones WHERE id='${ob}';`;
assert.equal(run(`SELECT count(*) FROM public.obligaciones WHERE id='${ob}'`),'0');
try{
 run(`BEGIN;CREATE UNIQUE INDEX IF NOT EXISTS obligacion_cumplimientos_vigente_unico ON public.obligacion_cumplimientos(obligacion_id,periodo_key) WHERE vigente;
 INSERT INTO public.obligaciones(id,empresa_id,nombre,activa) VALUES('${ob}','20000000-0000-4000-8000-000000000001','Concurrencia ficticia',true);
 INSERT INTO public.obligacion_ocurrencias(id,empresa_id,obligacion_id,periodo_key,fecha_vencimiento) VALUES('${oc}','20000000-0000-4000-8000-000000000001','${ob}','2026-08','2026-08-17');
 INSERT INTO public.obligacion_cumplimientos(empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada) VALUES('20000000-0000-4000-8000-000000000001','${ob}','${oc}','2026-08',false);COMMIT;`);
 const sql=`BEGIN;SELECT set_config('request.jwt.claim.sub','${uid}',true);SET LOCAL ROLE authenticated;SELECT public.registrar_cumplimiento_obligacion('${ob}','2026-08','${oc}');SELECT pg_sleep(0.3);COMMIT;`;
 const call=promisify(execFile);
 const results=await Promise.all([call(binary,[...args,'-c',sql],{env}),call(binary,[...args,'-c',sql],{env})]);
 const ids=results.map(r=>r.stdout.split('\n').find(line=>/^[a-f0-9-]{36}$/.test(line)&&line!==uid));
 assert.ok(ids[0]);assert.equal(ids[0],ids[1]);
 assert.equal(run(`SELECT count(*)||'|'||count(*) FILTER(WHERE vigente AND completada)||'|'||count(*) FILTER(WHERE NOT vigente AND NOT completada) FROM public.obligacion_cumplimientos WHERE obligacion_id='${ob}'`),'2|1|1');
 // Cliente legado que desmarca mientras la nueva RPC espera su registro.
 const legacy=spawn(binary,args,{env,stdio:['pipe','pipe','pipe']});
 let output='';let errors='';
 legacy.stdout.on('data',data=>{output+=data;});legacy.stderr.on('data',data=>{errors+=data;});
 const finished=new Promise((resolve,reject)=>{legacy.on('error',reject);legacy.on('close',code=>code===0?resolve():reject(new Error(errors)));});
 finished.catch(()=>{});
 try{
  legacy.stdin.write(`BEGIN;SELECT set_config('request.jwt.claim.sub','${uid}',true);SET LOCAL statement_timeout='5s';SELECT id FROM public.obligacion_cumplimientos WHERE obligacion_id='${ob}' AND vigente FOR UPDATE;SET LOCAL ROLE authenticated;SELECT 'ROW_LOCKED';\n`);
  for(let i=0;!output.includes('ROW_LOCKED')&&i<100;i++)await new Promise(r=>setTimeout(r,20));
  assert.ok(output.includes('ROW_LOCKED'),`La sesión legada no adquirió el bloqueo: ${errors}`);
  const concurrent=call(binary,[...args,'-c',`BEGIN;SET LOCAL application_name='obligation_mixed_new';SET LOCAL statement_timeout='5s';SELECT set_config('request.jwt.claim.sub','${uid}',true);SET LOCAL ROLE authenticated;SELECT public.registrar_cumplimiento_obligacion('${ob}','2026-08','${oc}');COMMIT;`],{env});
  concurrent.catch(()=>{});
  let blocked=false;
  for(let i=0;i<30&&!blocked;i++){
   blocked=run("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='obligation_mixed_new' AND wait_event_type='Lock')")==='t';
   if(!blocked)await new Promise(r=>setTimeout(r,20));
  }
  assert.ok(blocked,'Las sesiones no llegaron a solaparse');
  legacy.stdin.end(`SELECT public.corregir_cumplimiento('${ids[0]}',false);COMMIT;\n\\q\n`);
  await Promise.all([finished,concurrent]);
  assert.equal(run(`SELECT count(*)||'|'||count(*) FILTER(WHERE vigente AND completada) FROM public.obligacion_cumplimientos WHERE obligacion_id='${ob}'`),'4|1');
 }finally{if(legacy.exitCode===null)legacy.kill();}
 console.log('PASS: concurrencia RPC/RPC y RPC/corrección legada, sin duplicados ni bloqueo mutuo.');
}finally{run(cleanup);}
