import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarIcs } from '../.test-build/src/lib/calendarIcs.js';
import { calendarEventIsDone, isWeekendDate } from '../.test-build/src/lib/dashboardCalendar.js';
const now=new Date('2026-12-31T20:30:15.123Z');
const item=(extra={})=>({id:'oc-123',title:'Entrega anual',date:'2026-12-31',empresaId:'a',categoria:'immex',...extra});
const unfold=ics=>ics.replace(/\r\n /g,'');

test('ICS usa fechas de día completo, fin exclusivo y UID estable al cruzar de año',()=>{
 const text=buildCalendarIcs([item()],[],now);
 assert.ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
 assert.ok(text.endsWith('END:VCALENDAR\r\n'));
 assert.ok(text.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101\r\n'));
 assert.ok(text.includes('DTSTAMP:20261231T203015Z'));
 assert.equal(text.match(/^UID:.+$/m)[0],buildCalendarIcs([item()],[],new Date('2027-01-02T12:00:00Z')).match(/^UID:.+$/m)[0]);
 assert.ok(!text.includes('TZID='));
});
test('ICS exporta las alarmas efectivas de la empresa y del tipo, sin duplicados',()=>{
 const reminders=[{empresa_id:'b',tipo:'immex',dias_antes:[180]},{empresa_id:'a',tipo:'general',dias_antes:[60]},{empresa_id:'a',tipo:'immex',dias_antes:[30,7,7,-1,0,1.5]}];
 const text=buildCalendarIcs([item()],reminders,now);
 assert.deepEqual([...text.matchAll(/TRIGGER:([^\r]+)/g)].map(m=>m[1]),['-P7D','-P30D']);
 assert.equal((text.match(/BEGIN:VALARM/g)||[]).length,2);
 assert.ok(!text.includes('-P180D'));
});
test('ICS no inventa recordatorios para una configuración desactivada',()=>{
 assert.ok(!buildCalendarIcs([item()],[{empresa_id:'a',tipo:'immex',dias_antes:[]}],now).includes('VALARM'));
});
test('ICS escapa texto y evita inyección de propiedades con saltos de línea',()=>{
 const text=unfold(buildCalendarIcs([item({title:'A, B; C\\D\r\nBEGIN:VEVENT',description:'Folio 1\nSegunda línea'})],[],now));
 assert.ok(text.includes('SUMMARY:A\\, B\\; C\\\\D\\nBEGIN:VEVENT'));
 assert.ok(text.includes('DESCRIPTION:Folio 1\\nSegunda línea'));
 assert.equal(text.split('\r\n').filter(l=>l==='BEGIN:VEVENT').length,1);
});
test('ICS pliega texto UTF-8 a 75 octetos sin cortar caracteres',()=>{
 const title='Certificación — revisión 📅 '.repeat(20);
 const text=buildCalendarIcs([item({title})],[],now);
 for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
 assert.ok(unfold(text).includes(`SUMMARY:${title}`));
 assert.ok(!text.includes('\uFFFD'));
});
test('ICS deduplica identidad y descarta fechas imposibles sin perder el 29 de febrero',()=>{
 const text=buildCalendarIcs([item(),item(),item({id:'bad',date:'2027-02-29'}),item({id:'leap',date:'2028-02-29'})],[],now);
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,2);
 assert.ok(text.includes('DTEND;VALUE=DATE:20280301'));
});
test('el estado vigente prevalece al ocultar cumplidas y corregir una marca anterior',()=>{
 assert.equal(calendarEventIsDone({extendedProps:{completada:false,estado:'cumplida'}}),false);
 assert.equal(calendarEventIsDone({extendedProps:{completada:true,estado:'pendiente'}}),true);
 assert.equal(calendarEventIsDone({extendedProps:{estado:'completada'}}),true);
});
test('el aviso de fin de semana reconoce sábado/domingo sin desplazar fechas',()=>{
 assert.equal(isWeekendDate('2026-11-07'),true);
 assert.equal(isWeekendDate('2026-11-08'),true);
 assert.equal(isWeekendDate('2026-11-09'),false);
 assert.equal(isWeekendDate(null),false);
});
