import test from 'node:test';
import assert from 'node:assert/strict';
import { anexo30BaseDate, anexo30PeriodLabel } from '../.test-build/src/lib/anexo30.js';
import { summarizePeriod } from '../.test-build/src/lib/obligationModel.js';

test('inventario inicial cuenta treinta días naturales y cruza años/bisiestos', () => {
  assert.equal(anexo30BaseDate('2026-10-01', 'inicial'), '2026-10-31');
  assert.equal(anexo30BaseDate('2028-02-01', 'inicial'), '2028-03-02');
  assert.equal(anexo30BaseDate('2026-12-15', 'inicial'), '2027-01-14');
});
test('descargos vencen en el mes siguiente al cierre, no al inicio de certificación', () => {
  assert.equal(anexo30BaseDate('2026-09-01', 'mensual'), '2026-10-31');
  assert.equal(anexo30BaseDate('2026-09-01', 'bimestral'), '2026-11-30');
  assert.equal(anexo30BaseDate('2026-12-01', 'bimestral'), '2027-02-28');
  assert.equal(anexo30BaseDate('2028-01-01', 'mensual'), '2028-02-29');
});
test('rechaza fechas imposibles y orígenes parciales en entregas por mes', () => {
  assert.equal(anexo30BaseDate('2026-02-30', 'inicial'), null);
  assert.equal(anexo30BaseDate('2026-09-15', 'mensual'), null);
});
test('el periodo se muestra por operaciones y no por el mes de presentación', () => {
  assert.equal(anexo30PeriodLabel('anexo30:2026-09:2026-10'), 'septiembre de 2026 a octubre de 2026');
  assert.equal(anexo30PeriodLabel('anexo30:2026-09:2026-09'), 'septiembre de 2026');
  assert.equal(anexo30PeriodLabel('2026-09'), null);
  assert.equal(anexo30PeriodLabel('anexo30:2026-13:2026-14'), null);
});
test('un descargo bimestral cuenta una vez en el mes de presentación', () => {
  const action = { id: 'a', periodo: 'anexo30:2026-09:2026-10', fecha: '2026-11-30', completada: false };
  assert.equal(summarizePeriod([action, action], '2026-11').total, 1);
  assert.equal(summarizePeriod([action], '2026-09').total, 0);
});
