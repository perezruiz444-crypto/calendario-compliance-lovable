import { addCalendarDays } from './obligationDate.js';
import { validDateKey } from './obligationModel.js';
import { obligationReminderType } from '../../supabase/functions/_shared/reminderRules.js';

export interface CalendarExportItem {
  id: string;
  title: string;
  date: string;
  empresaId: string;
  categoria: string;
  description?: string;
}
export interface CalendarReminderDays {
  empresa_id: string;
  tipo: string;
  dias_antes: number[];
}

const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

/** RFC 5545: cada línea física tiene como máximo 75 octetos, sin cortar UTF-8. */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  const encoder = new TextEncoder();
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      parts.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

/** Exporta solo los elementos pendientes que el llamador seleccionó en la vista. */
export function buildCalendarIcs(items: readonly CalendarExportItem[], reminders: readonly CalendarReminderDays[], now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Calendario Compliance//Obligaciones//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Calendario de cumplimiento'];
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const seen = new Set<string>();
  for (const item of items) {
    if (!validDateKey(item.date) || seen.has(item.id)) continue;
    seen.add(item.id);
    const tipo = obligationReminderType(item.categoria);
    const days = reminders.find(r => r.empresa_id === item.empresaId && r.tipo === tipo)?.dias_antes ?? [];
    lines.push('BEGIN:VEVENT', `UID:${encodeURIComponent(item.id)}@calendario-compliance.lovable.app`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${item.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addCalendarDays(item.date, 1).replace(/-/g, '')}`,
      `SUMMARY:${escapeText(item.title)}`, `DESCRIPTION:${escapeText(item.description ?? 'Obligación pendiente de cumplimiento.')}`, 'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT');
    for (const day of [...new Set(days)].filter(day => Number.isInteger(day) && day > 0).sort((a, b) => a - b)) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(item.title)}`, `TRIGGER:-P${day}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
