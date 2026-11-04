import { addCalendarDays } from './obligationDate.js';

export function pendingNext30<T extends { start: string; extendedProps: { completada?: boolean; estado?: string } }>(events: readonly T[], today: string): T[] {
  const limit = addCalendarDays(today, 30);
  return events.filter(e => !(e.extendedProps.completada ?? ['cumplida', 'completada'].includes(e.extendedProps.estado ?? '')) && e.extendedProps.estado !== 'cancelada'
    && e.start >= today && e.start <= limit).sort((a, b) => a.start.localeCompare(b.start));
}

export function completionCounts(items: readonly { id: string }[], completions: Readonly<Record<string, boolean>>) {
  const completadas = items.filter(item => completions[item.id]).length;
  return { completadas, pendientes: items.length - completadas };
}
