import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { calendarDaysUntil, getVencimientoInfo, nextRenewalDate, addCalendarDays } from '../.test-build/src/lib/obligationDate.js';
import { pendingNext30, completionCounts } from '../.test-build/src/lib/dashboardCalendar.js';
import { reminderDays, obligationReminderType } from '../.test-build/supabase/functions/_shared/reminderRules.js';

test('vence hoy durante todo el día de México, incluso después de mediodía y del cambio de día UTC', () => {
  for (const now of ['2026-12-31T06:00:00Z', '2026-12-31T18:01:00Z', '2027-01-01T05:59:59Z']) {
    assert.deepEqual(getVencimientoInfo('2026-12-31', new Date(now)), { status: 'urgente', days: 0 });
  }
  assert.deepEqual(getVencimientoInfo('2026-12-31', new Date('2027-01-01T06:00:00Z')), { status: 'vencido', days: -1 });
  assert.equal(calendarDaysUntil('2027-01-02', new Date('2027-01-01T05:59:59Z')), 2);
});

test('umbrales de urgencia son días calendario y fechas inválidas no inventan estados', () => {
  const now = new Date('2026-12-31T23:59:00Z');
  for (const [days, status] of [[-1,'vencido'],[0,'urgente'],[30,'urgente'],[31,'proximo'],[90,'proximo'],[91,'vigente']]) {
    assert.deepEqual(getVencimientoInfo(addCalendarDays('2026-12-31', days), now), { days, status });
  }
  for (const value of [null, '', 'inválida', '2026-02-30']) assert.equal(getVencimientoInfo(value, now), null);
});

test('pantallas, selectores, PDF y correo preservan el día en zonas a ambos lados de UTC', () => {
  const moduleUrl = new URL('../.test-build/src/lib/obligationDate.js', import.meta.url).href;
  const code = `import {parseCalendarDate,formatCalendarDate,calendarDaysUntil} from ${JSON.stringify(moduleUrl)};
    import {format} from 'date-fns';
    const d=parseCalendarDate('2026-12-31');
    console.log(JSON.stringify([format(d,'yyyy-MM-dd'), d.toLocaleDateString('es-MX'),formatCalendarDate('2026-12-31'),calendarDaysUntil('2026-12-31',new Date('2027-01-01T05:59:59Z')),parseCalendarDate('2026-12-31T23:00:00Z').toISOString()]));`;
  for (const TZ of ['UTC', 'America/Mexico_City', 'America/Tijuana', 'Europe/Madrid', 'Pacific/Kiritimati']) {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }));
    assert.deepEqual(result, ['2026-12-31', '31/12/2026', '31/12/2026', 0, '2026-12-31T23:00:00.000Z'], TZ);
  }
});

test('renovación de hoy no salta al periodo siguiente y conserva fin de mes bisiesto', () => {
  assert.equal(nextRenewalDate('2025-12-31', 12, '2026-12-31'), '2026-12-31');
  assert.equal(nextRenewalDate('2025-12-31', 12, '2027-01-01'), '2027-12-31');
  assert.equal(nextRenewalDate('2023-01-31', 1, '2024-02-01'), '2024-02-29');
  assert.equal(nextRenewalDate('2023-01-31', 0, '2024-02-01'), null);
});

test('contadores mensuales ignoran ocho cumplimientos históricos ajenos al mes', () => {
  const historical = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`old-${i}`, true]));
  assert.deepEqual(completionCounts([{id:'a'}, {id:'b'}, {id:'c'}], historical), { completadas: 0, pendientes: 3 });
  assert.deepEqual(completionCounts([{id:'a'}, {id:'b'}, {id:'c'}], {...historical,a:true}), { completadas: 1, pendientes: 2 });
});

test('próximos 30 días cruza mes/año, incluye día 30 completo y excluye cumplidas y canceladas', () => {
  const event = (id, start, extendedProps = {}) => ({ id, start, extendedProps });
  const events = [event('done','2026-12-31',{completada:true}), event('today','2026-12-31'),
    event('last','2027-01-30'),event('outside','2027-01-31'),event('past','2026-12-30'),
    event('cancelled','2027-01-02',{estado:'cancelada'}), event('task-done','2027-01-02',{estado:'completada'}),
    event('corrected','2027-01-01',{completada:false,estado:'cumplida'})];
  assert.deepEqual(pendingNext30(events,'2026-12-31').map(e => e.id), ['today','corrected','last']);
});

test('recordatorios particulares no afectan otras empresas y sustituyen a los globales', () => {
  const rule = (dias_antes, empresa_id = null, activa = true) => ({tipo:'immex',dias_antes,empresa_id,activa});
  const rules = [rule(30), rule(90,'a'),rule(7,'a'),rule(180,'b')];
  assert.deepEqual(reminderDays(rules,'immex','a'), [7,90]);
  assert.deepEqual(reminderDays(rules,'immex','b'), [180]);
  assert.deepEqual(reminderDays(rules,'immex','c'), [30]);
  assert.deepEqual(reminderDays([rule(30),rule(90,'a',false)],'immex','a'), []);
  assert.deepEqual(reminderDays([],'general','a'), [1,7,30]);
  assert.equal(obligationReminderType('cert_iva_ieps'), 'certificacion');
});
