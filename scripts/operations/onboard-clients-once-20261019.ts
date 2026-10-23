import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { sendEmail } from '../../supabase/functions/_shared/smtp.ts';
import { userInvitationTemplate } from '../../supabase/functions/_shared/email-templates.ts';

// Operación explícita y acotada. Sin destinatarios, contraseñas ni enlaces en el código.
// Los dos encargos autorizados están en audit_logs, con SELECT exclusivo de administradores.
const OPERATIONS = new Set([
  'd73c5c86-32f4-4e38-9ca9-fcbe156cff59',
  'cafbf325-cd61-4aee-bcc8-bf78522a7f5b',
]);
const COMPANY = '8ab96943-8866-40d9-8c13-c75ae2aaefc8';
const ACTION = 'alta_clientes_xinquan_20261019';
const DEADLINE = Date.parse('2026-10-20T06:00:00Z');
const APP = 'https://calendario-compliance.lovable.app';

export async function handler(req: Request): Promise<Response> {
  const secret = Deno.env.get('CRON_SECRET') ?? '';
  if (!secret || req.headers.get('x-cron-secret') !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (Date.now() > DEADLINE) return Response.json({ error: 'Operation expired' }, { status: 410 });
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let claimed: string | null = null;
  let userId: string | null = null;
  let stage = 'preflight';
  try {
    const { operation_id, dry_run } = await req.json();
    if (typeof operation_id !== 'string' || !OPERATIONS.has(operation_id)) return Response.json({ error: 'Operation not allowed' }, { status: 403 });
    const { data: operation, error: operationError } = await db.from('audit_logs').select('old_values,new_values').eq('id', operation_id).eq('action', ACTION).single();
    if (operationError || !operation) throw new Error('Operation unavailable');
    const input = operation.old_values;
    if (!input || input.empresa_id !== COMPANY || input.role !== 'cliente' || typeof input.email !== 'string'
      || !/^[a-z.]+@xinquan\.cn$/.test(input.email) || typeof input.nombre_completo !== 'string') {
      return Response.json({ error: 'Invalid approved operation' }, { status: 403 });
    }
    // Recuperación manual limitada al fallo verificado ANTES de generar enlace o intentar SMTP.
    const resume = operation.new_values?.estado === 'error_o_incierto'
      && operation.new_values?.etapa === 'verify_access' && typeof operation.new_values?.user_id === 'string';
    if (operation.new_values?.estado !== 'aprobado' && !resume) return Response.json({ error: 'Already attempted; inspect audit before retrying' }, { status: 409 });
    const { data: company, error: companyError } = await db.from('empresas').select('id,razon_social').eq('id', COMPANY).single();
    if (companyError || company?.razon_social !== 'XINQUAN MEXICO AUTOMOTIVE TRIM S. DE R.L DE C.V.') throw new Error('Company unavailable');
    if (dry_run === true) return Response.json({ ready: true, role: 'cliente', company: 'Xinquan', operation_id });
    // Reclamo atómico: llamadas repetidas/concurrentes no recrean usuarios ni reenvían correos.
    const { data: claim, error: claimError } = await db.from('audit_logs').update({ new_values: { estado: 'creando', iniciado_en: new Date().toISOString() } })
      .eq('id', operation_id).eq('action', ACTION).eq('new_values->>estado', operation.new_values.estado).select('id').maybeSingle();
    if (claimError) throw new Error('Claim unavailable');
    if (!claim) return Response.json({ error: 'Already claimed' }, { status: 409 });
    claimed = operation_id;
    if (resume) {
      userId = operation.new_values.user_id;
      const { data: existing, error: existingError } = await db.auth.admin.getUserById(userId!);
      if (existingError || existing.user?.email !== input.email || existing.user?.app_metadata?.role !== 'cliente'
        || existing.user?.app_metadata?.empresa_id !== COMPANY) throw new Error('Recovery identity mismatch');
    } else {
      stage = 'create_user';
      // Contraseña inicial aleatoria de alta entropía, nunca almacenada en logs ni enviada por correo.
      const password = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('') + 'aA7!';
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: input.email, password, email_confirm: true,
        user_metadata: { nombre_completo: input.nombre_completo },
        app_metadata: { role: 'cliente', empresa_id: COMPANY },
      });
      if (createError || !created.user) throw new Error('User creation failed');
      userId = created.user.id;
    }
    stage = 'verify_access';
    // Auth puede insertar el usuario antes de aplicar app_metadata; no asumir el vínculo del trigger.
    const { error: linkProfileError } = await db.from('profiles').update({ empresa_id: COMPANY, nombre_completo: input.nombre_completo }).eq('id', userId);
    if (linkProfileError) throw new Error('Company assignment failed');
    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      db.from('profiles').select('id,nombre_completo,empresa_id').eq('id', userId).single(),
      db.from('user_roles').select('role').eq('user_id', userId),
    ]);
    if (profileError || rolesError || profile?.empresa_id !== COMPANY || profile?.nombre_completo !== input.nombre_completo
      || roles?.length !== 1 || roles[0].role !== 'cliente') throw new Error('Access verification failed');
    const save = async (estado: string) => {
      const { error } = await db.from('audit_logs').update({ new_values: { estado, user_id: userId, empresa_id: COMPANY, actualizado_en: new Date().toISOString() } }).eq('id', operation_id);
      if (error) throw new Error('Audit update failed');
    };
    await save('usuario_creado');
    stage = 'generate_setup_link';
    const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'recovery', email: input.email, options: { redirectTo: `${APP}/set-password` } });
    if (linkError || !link?.properties?.action_link) throw new Error('Setup link unavailable');
    const html = userInvitationTemplate(input.nombre_completo, link.properties.action_link)
      .replace('<p>Para comenzar, configura tu contraseña:</p>', '<p>Tu cuenta está vinculada a <strong>Xinquan México Automotive Trim</strong>. Puedes consultar y registrar seguimiento, cumplimientos y evidencia de tu empresa.</p><p>Para comenzar, configura tu contraseña:</p>')
      .replace('El enlace para crear tu contraseña es válido por 7 días.', 'El enlace para crear tu contraseña tiene vigencia limitada. Si caduca, solicita uno nuevo a tu administrador.');
    stage = 'smtp';
    await save('enviando');
    await sendEmail(input.email, 'Bienvenida a Calendario Compliance — Xinquan', html);
    stage = 'save_smtp_acceptance';
    await save('smtp_aceptado');
    return Response.json({ success: true, user_id: userId, role: 'cliente', company: 'Xinquan', smtpAccepted: true });
  } catch {
    if (claimed) {
      await db.from('audit_logs').update({ new_values: { estado: 'error_o_incierto', etapa: stage, user_id: userId, actualizado_en: new Date().toISOString() } }).eq('id', claimed);
    }
    return Response.json({ error: 'Operation incomplete or uncertain; inspect audit before any retry', stage }, { status: 500 });
  }
}
if (import.meta.main) Deno.serve(handler);
