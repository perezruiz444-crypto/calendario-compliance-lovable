import { addCalendarDays, parseCalendarDate } from './obligationDate.js';

export function calendarEventIsDone(event: { extendedProps: { completada?: boolean; estado?: string } }): boolean {
  return event.extendedProps.completada ?? ['cumplida', 'completada'].includes(event.extendedProps.estado ?? '');
}

export function isWeekendDate(value: string | null): boolean {
  if (!value) return false;
  const day = parseCalendarDate(value).getDay();
  return day === 0 || day === 6;
}

export function pendingNext30<T extends { start: string; extendedProps: { completada?: boolean; estado?: string } }>(events: readonly T[], today: string): T[] {
  const limit = addCalendarDays(today, 30);
  return events.filter(e => !calendarEventIsDone(e) && e.extendedProps.estado !== 'cancelada'
    && e.start >= today && e.start <= limit).sort((a, b) => a.start.localeCompare(b.start));
}

export function completionCounts(items: readonly { id: string }[], completions: Readonly<Record<string, boolean>>) {
  const completadas = items.filter(item => completions[item.id]).length;
  return { completadas, pendientes: items.length - completadas };
}
