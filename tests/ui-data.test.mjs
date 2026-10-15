import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getReportDateRange } from '../.test-build/src/lib/reportPeriod.js';
import { loadAllPages } from '../.test-build/src/lib/pagination.js';

const date = value => new Date(value + 'T12:00:00');
const localDate = value => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');

for (const [today, start, end] of [
  ['2026-10-10', '2026-07-01', '2026-09-30'],
  ['2026-01-01', '2025-10-01', '2025-12-31'],
  ['2024-04-01', '2024-01-01', '2024-03-31'],
  ['2026-06-30', '2026-01-01', '2026-03-31'],
]) {
  test('trimestre anterior completo desde ' + today, () => {
    const now = date(today);
    const original = now.getTime();
    const range = getReportDateRange('trimestre', now);
    assert.equal(localDate(range.startDate), start);
    assert.equal(localDate(range.endDate), end);
    assert.equal(range.startDate.getHours(), 0);
    assert.equal(range.endDate.getHours(), 23);
    assert.equal(range.endDate.getMilliseconds(), 999);
    assert.equal(now.getTime(), original);
  });
}

test('mes anterior conserva febrero bisiesto', () => {
  const range = getReportDateRange('mes_anterior', date('2024-03-31'));
  assert.equal(localDate(range.startDate), '2024-02-01');
  assert.equal(localDate(range.endDate), '2024-02-29');
});

test('mes actual, año actual y período desconocido', () => {
  for (const period of ['mes_actual', 'desconocido']) {
    const range = getReportDateRange(period, date('2026-10-10'));
    assert.equal(localDate(range.startDate), '2026-10-01');
    assert.equal(localDate(range.endDate), '2026-10-31');
  }
  const year = getReportDateRange('anio', date('2026-10-10'));
  assert.equal(localDate(year.startDate), '2026-01-01');
  assert.equal(localDate(year.endDate), '2026-12-31');
});

test('recupera más de 1000 filas sin saltarse páginas limitadas por el servidor', async () => {
  const rows = Array.from({ length: 1103 }, (_, id) => ({ id }));
  const offsets = [];
  const actual = await loadAllPages(async (offset, size) => {
    offsets.push(offset);
    return { data: rows.slice(offset, offset + Math.min(size, 100)), error: null };
  });
  assert.deepEqual(actual, rows);
  assert.deepEqual(offsets, [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1103]);
});

test('una página con error rechaza el resultado completo', async () => {
  const failure = new Error('sin conexión');
  await assert.rejects(loadAllPages(async offset => offset === 0
    ? { data: [{ id: 1 }], error: null }
    : { data: null, error: failure }), error => error === failure);
});

test('resultado vacío y validación del tamaño de página', async () => {
  assert.deepEqual(await loadAllPages(async () => ({ data: null, error: null })), []);
  await assert.rejects(loadAllPages(async () => ({ data: [], error: null }), 0), RangeError);
  await assert.rejects(loadAllPages(async () => ({ data: [], error: null }), 1.5), RangeError);
});
