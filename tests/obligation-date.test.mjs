import test from 'node:test';
import assert from 'node:assert/strict';
let dateKey;
try { ({mexicoDateKey:dateKey}=await import('../.test-build/src/lib/obligationDate.js')); }
catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
test('el día de cumplimiento es el de México, aunque UTC ya sea el siguiente',()=>{
 assert.equal(typeof dateKey,'function','Fecha mexicana aún no implementada');
 assert.equal(dateKey(new Date('2026-10-15T03:00:00Z')),'2026-10-14');
 assert.equal(dateKey(new Date('2026-10-15T06:00:00Z')),'2026-10-15');
});
