/** Resumen de tareas del reporte; las obligaciones se muestran por separado. */
export function buildTaskReportSummary(tareas: readonly { estado: string | null }[]) {
  const totalTareas = tareas.length;
  const tareasCompletadas = tareas.filter(t => t.estado === 'completada').length;
  const tareasPendientes = tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length;

  return {
    totalTareas,
    tareasCompletadas,
    tareasPendientes,
    tasaCompletitud: totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0,
  };
}
