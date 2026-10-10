import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskReportSummary } from '../.test-build/reportSummary.js';

test('el porcentaje y los contadores usan las mismas 17 tareas', () => {
  const tareas = [{ estado: 'completada' }, ...Array.from({ length: 16 }, () => ({ estado: 'pendiente' }))];
  assert.deepEqual(buildTaskReportSummary(tareas), {
    totalTareas: 17,
    tareasCompletadas: 1,
    tareasPendientes: 16,
    tasaCompletitud: 6,
  });
});

test('tareas en progreso son pendientes y las canceladas no son completadas', () => {
  const tareas = ['completada', 'completada', 'pendiente', 'en_progreso', 'cancelada'].map(estado => ({ estado }));
  assert.deepEqual(buildTaskReportSummary(tareas), {
    totalTareas: 5,
    tareasCompletadas: 2,
    tareasPendientes: 2,
    tasaCompletitud: 40,
  });
});

test('un reporte sin tareas tiene tasa cero y no produce NaN', () => {
  assert.deepEqual(buildTaskReportSummary([]), {
    totalTareas: 0,
    tareasCompletadas: 0,
    tareasPendientes: 0,
    tasaCompletitud: 0,
  });
});

test('un estado nulo cuenta en el total sin inventar que la tarea está completada', () => {
  assert.deepEqual(buildTaskReportSummary([{ estado: null }, { estado: 'completada' }]), {
    totalTareas: 2,
    tareasCompletadas: 1,
    tareasPendientes: 0,
    tasaCompletitud: 50,
  });
});

test('todas completadas dan 100% y solo pendientes dan 0%', () => {
  assert.equal(buildTaskReportSummary([{ estado: 'completada' }]).tasaCompletitud, 100);
  assert.equal(buildTaskReportSummary([{ estado: 'pendiente' }]).tasaCompletitud, 0);
});

test('un subconjunto filtrado usa su propio denominador', () => {
  const tareas = [{ estado: 'completada' }, { estado: 'pendiente' }];
  assert.equal(buildTaskReportSummary(tareas.filter(t => t.estado === 'completada')).tasaCompletitud, 100);
  assert.equal(buildTaskReportSummary(tareas).tasaCompletitud, 50);
});
