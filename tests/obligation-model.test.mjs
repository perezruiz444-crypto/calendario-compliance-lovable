import test from 'node:test';
import assert from 'node:assert/strict';
let model = {};
try { model = await import('../.test-build/src/lib/obligationModel.js'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const call = (name, ...args) => {
  assert.equal(typeof model[name], 'function', `${name} aún no implementada`);
  return model[name](...args);
};
const rule = (tipo) => ({ tipo, clasificacionAprobada: true, normativaValidada: false });
const obligation = (id, tipo, extra = {}) => ({ id, empresaId: 'company-a', programa: 'immex', activa: true, aplicable: true, regla: rule(tipo), ...extra });
const action = (id, obligacionId, extra = {}) => ({ id, obligacionId, empresaId: 'company-a', fecha: '2026-10-14', origenFecha: 'heredada', periodo: '2026-10', completada: false, eventoId: null, ...extra });

test('clasificación necesita aprobación, sin inferirla de texto o frecuencia', () => {
  assert.equal(call('classifyObligation', null), 'por_clasificar');
  assert.equal(call('classifyObligation', { ...rule('condicion'), clasificacionAprobada: false }), 'por_clasificar');
  assert.equal(call('classifyObligation', rule('condicion')), 'condicion');
});
test('condiciones y riesgos no inflan acciones por ocurrencias antiguas', () => {
  const sections = call('buildObligationSections', [obligation('control', 'condicion'), obligation('risk', 'riesgo'), obligation('report', 'periodica')], [action('legacy-control', 'control'), action('legacy-risk', 'risk'), action('report-oct', 'report')]);
  assert.deepEqual(sections.acciones.map(a => a.id), ['report-oct']);
  assert.deepEqual(sections.condiciones.map(o => o.id), ['control']);
});
test('evento sin registro no crea acción; evento registrado sin fecha sí', () => {
  const sections = call('buildObligationSections', [obligation('event', 'evento')], [action('orphan', 'event'), action('activated', 'event', { eventoId: 'evt', fecha: null, periodo: null })]);
  assert.deepEqual(sections.acciones.map(a => a.id), ['activated']);
});
test('obligación, acción y empresa deben coincidir', () => {
  const sections = call('buildObligationSections', [obligation('report', 'periodica')], [action('cross-company', 'report', { empresaId: 'company-b' }), action('unknown-parent', 'other'), action('good', 'report')]);
  assert.deepEqual(sections.acciones.map(a => a.id), ['good']);
});
test('inactivas y no aplicables se excluyen; aplicabilidad desconocida sigue visible', () => {
  const sections = call('buildObligationSections', [obligation('off', 'periodica', { activa: false }), obligation('na', 'periodica', { aplicable: false }), obligation('unknown', 'periodica', { aplicable: null })], [action('off-action', 'off'), action('na-action', 'na'), action('unknown-action', 'unknown')]);
  assert.deepEqual(sections.porRevisar.map(o => o.id), ['unknown']);
  assert.deepEqual(sections.acciones.map(a => a.id), ['unknown-action']);
});
test('reglas legadas siguen visibles y no pierden vencimientos', () => {
  const sections = call('buildObligationSections', [obligation('legacy', null, { regla: null })], [action('due', 'legacy')]);
  assert.deepEqual(sections.porRevisar.map(o => o.id), ['legacy']);
  assert.deepEqual(sections.acciones.map(a => a.id), ['due']);
});
test('una condición con revisión interna explícita sí genera acción interna', () => {
  const sections = call('buildObligationSections', [obligation('control', 'condicion')], [action('internal', 'control', { origenFecha: 'interna' }), action('legacy', 'control')]);
  assert.deepEqual(sections.acciones.map(a => a.id), ['internal']);
});
test('cumplimiento efectivo prevalece sobre fecha pasada; hoy no vence antes de terminar el día', () => {
  assert.equal(call('effectiveActionState', action('a', 'o'), '2026-10-14'), 'pendiente');
  assert.equal(call('effectiveActionState', action('a', 'o', { fecha: '2026-10-13' }), '2026-10-14'), 'vencida');
  assert.equal(call('effectiveActionState', action('a', 'o', { fecha: '2026-10-13', completada: true }), '2026-10-14'), 'cumplida');
  assert.equal(call('effectiveActionState', action('a', 'o', { fecha: null }), '2026-10-14'), 'pendiente');
});
test('fecha inválida no produce una falsa vencida', () => {
  assert.equal(call('effectiveActionState', action('a', 'o', { fecha: '2026-02-31' }), '2026-10-14'), 'pendiente');
});
test('porcentaje usa solo el periodo solicitado y deduplica IDs', () => {
  const done = action('a', 'o', { completada: true });
  const pending = action('b', 'o');
  assert.deepEqual(call('summarizePeriod', [done, {...done}, pending, action('future', 'o', { periodo: '2027-10' })], '2026-10'), { total: 2, cumplidas: 1, pendientes: 1, porcentaje: 50 });
  assert.equal(call('summarizePeriod', [done, pending], '2027-10').porcentaje, null);
});
test('cumplir un periodo no completa el siguiente', () => {
  const items = [action('oct', 'o', { completada: true }), action('nov', 'o', { periodo: '2026-11', fecha: '2026-11-14' })];
  assert.equal(call('summarizePeriod', items, '2026-10').porcentaje, 100);
  assert.equal(call('summarizePeriod', items, '2026-11').porcentaje, 0);
});

test('construir secciones conserva todos los atrasos, cumplimientos y periodos futuros', () => {
  const result = call('buildObligationSections', [obligation('report', 'periodica')], [
    action('old-one','report',{periodo:'2026-08',fecha:'2026-08-20'}),
    action('old-two','report',{periodo:'2026-09',fecha:'2026-09-20'}),
    action('done','report',{completada:true}),
    action('next','report',{periodo:'2026-11',fecha:'2026-11-20'})
  ]);
  assert.deepEqual(result.acciones.map(a => a.id), ['old-one','old-two','done','next']);
  assert.equal(call('summarizePeriod',result.acciones,'2026-08').pendientes,1);
  assert.equal(call('summarizePeriod',result.acciones,'2026-10').cumplidas,1);
});
test('la revisión interna pendiente se comparte y solo cuenta la más reciente',async()=>{
 const {latestScheduledReviews}=await import('../.test-build/supabase/functions/_shared/obligationPresentation.js');
 const rows=[{id:'old',obligacion_id:'o',revisada_en:'2026-10-13',proxima_revision:'2026-10-14'},{id:'new',obligacion_id:'o',revisada_en:'2026-10-15',proxima_revision:'2026-10-16'}];
 assert.deepEqual(latestScheduledReviews(rows).map(r=>r.id),['new']);
 assert.deepEqual(latestScheduledReviews([...rows,{id:'last',obligacion_id:'o',revisada_en:'2026-10-16',proxima_revision:null}]),[]);
});


test('el inventario distingue controles, eventos y consecuencias sin inferir cumplimiento', () => {
  assert.equal(call('managementFollowupLabel', true, rule('condicion'), true), 'Condición permanente');
  assert.equal(call('managementFollowupLabel', true, rule('evento'), true), 'Por evento');
  assert.equal(call('managementFollowupLabel', true, rule('riesgo'), true), 'Consecuencia del incumplimiento');
  assert.equal(call('managementFollowupLabel', true, rule('periodica'), true), 'Entrega periódica');
  assert.equal(call('managementFollowupLabel', true, rule('vigencia'), true), 'Vigencia documental');
});
test('el inventario conserva inactivas y no presenta una clasificación desconocida como confirmada', () => {
  assert.equal(call('managementFollowupLabel', false, rule('condicion'), true), 'Inactiva');
  assert.equal(call('managementFollowupLabel', true, null, true), 'Por clasificar');
  assert.equal(call('managementFollowupLabel', true, {...rule('condicion'), clasificacionAprobada:false}, true), 'Por clasificar');
  assert.equal(call('managementFollowupLabel', true, rule('condicion'), false), 'Seguimiento por confirmar');
});
