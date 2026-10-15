import test from 'node:test';
import assert from 'node:assert/strict';
let guard;
try { ({ assertLocalSupabase: guard } = await import('./fixtures/local-supabase.mjs')); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const check = (...args) => { assert.equal(typeof guard, 'function', 'Guarda local aún no implementada'); return guard(...args); };
test('fixture permite exclusivamente loopback', () => {
  assert.doesNotThrow(() => check('http://127.0.0.1:54321'));
  assert.doesNotThrow(() => check('http://localhost:54321'));
  assert.doesNotThrow(() => check('http://[::1]:54321'));
});
test('fixture bloquea producción y hosts remotos antes de escribir', () => {
  assert.throws(() => check('https://svozqrjhwaohfmbkhpig.supabase.co'), /solo admiten/);
  assert.throws(() => check('http://localhost.example.com:54321'), /solo admiten/);
});
