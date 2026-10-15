// Solo una base de contrato sintética ya inicializada: nunca acepta URL remota.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertLocalSupabase } from '../tests/fixtures/local-supabase.mjs';

const url = 'postgresql://postgres@127.0.0.1:55439/calendario_obligaciones_test';
assertLocalSupabase(url.replace('postgresql:', 'http:'));
const binary = process.env.PSQL_BINARY || 'psql';
// No heredar PGHOST, PGDATABASE, PGSERVICE ni PGOPTIONS de otra sesión.
const env = { PATH: process.env.PATH, LANG: 'C', PGPASSFILE: '/dev/null' };
const args = ['-X', '-w', '-h', '127.0.0.1', '-p', '55439', '-U', 'postgres', '-d', 'calendario_obligaciones_test', '-v', 'ON_ERROR_STOP=1'];
const identity = execFileSync(binary, [...args, '-Atc', "SELECT current_database() || '|' || inet_server_addr() || '|' || inet_server_port() || '|' || (SELECT razon_social FROM public.empresas WHERE id = '20000000-0000-4000-8000-000000000001')"], { env, encoding: 'utf8' }).trim();
if (identity !== 'calendario_obligaciones_test|127.0.0.1/32|55439|Empresa A ficticia' && identity !== 'calendario_obligaciones_test|127.0.0.1|55439|Empresa A ficticia') {
  throw new Error('Base no reconocida como contrato local sintético. No ejecutar migración.');
}
const sql = path => execFileSync(binary, [...args, '-f', fileURLToPath(new URL(path, import.meta.url))], { env, stdio: 'inherit' });
sql('../supabase/migrations/20261014190000_obligation_types_and_rules.sql');
sql('../supabase/migrations/20261014190000_obligation_types_and_rules.sql');
sql('../supabase/migrations/20261015141908_obligation_events_and_reviews.sql');
sql('../supabase/migrations/20261015141909_obligation_rule_calculation.sql');
sql('../supabase/migrations/20261015143449_obligation_evidence_access.sql');
sql('../supabase/migrations/20261015144352_obligation_notifications.sql');
for(const file of ['obligation-block-a.sql','obligation-events.sql','obligation-rules.sql','obligation-direct-assignment.sql','obligation-storage.sql','obligation-generator.sql','obligation-notifications.sql'])sql(`../supabase/tests/${file}`);
console.log('PASS: contrato PostgreSQL local e idempotencia. No acredita Supabase Auth/Storage ni replay del esquema completo.');
