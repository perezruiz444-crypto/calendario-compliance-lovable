import { handler } from '../../scripts/operations/onboard-clients-once-20261019.ts';

Deno.env.set('SUPABASE_URL', 'https://example.invalid');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'local-test-only');
Deno.env.set('CRON_SECRET', 'local-test-only-secret');

const request = (method: string, body?: object, authorized = true) => new Request('https://example.invalid', {
  method,
  headers: authorized ? { 'x-cron-secret': 'local-test-only-secret', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
async function at(time: string, check: () => Promise<void>) {
  const original = Date.now;
  Date.now = () => Date.parse(time);
  try { await check(); } finally { Date.now = original; }
}
async function status(response: Promise<Response>, expected: number) {
  const actual = (await response).status;
  if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
}
Deno.test('sin autorización interna no se consulta ni crea una cuenta', () => at('2026-10-19T19:00:00Z', () => status(handler(request('POST', { operation_id: 'arbitrary' }, false)), 401)));
Deno.test('GET nunca ejecuta una operación', () => at('2026-10-19T19:00:00Z', () => status(handler(request('GET')), 405)));
Deno.test('un encargo fuera de la lista no consulta datos ni crea usuarios', () => at('2026-10-19T19:00:00Z', () => status(handler(request('POST', { operation_id: 'arbitrary' })), 403)));
Deno.test('la operación caducada no admite ni un encargo autorizado', () => at('2026-10-21T00:00:00Z', () => status(handler(request('POST', { operation_id: 'd73c5c86-32f4-4e38-9ca9-fcbe156cff59' })), 410)));
