import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { sendEmail } from '../_shared/smtp.ts'

// Acción interna explícita, separada del resumen diario: nunca envía a todos los usuarios.
Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET') ?? ''
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Unauthorized', {status:401})
  if (req.method !== 'POST') return new Response('Method not allowed', {status:405})
  const reply = (body: object, status = 200) => Response.json(body, {status})
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  let claimed: string | null = null
  try {
    const {mensaje_id} = await req.json()
    if (typeof mensaje_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mensaje_id)) return reply({error:'Invalid message'},400)
    const {data:message,error} = await db.from('mensajes').select('id,remitente_id,destinatario_id,asunto,contenido').eq('id',mensaje_id).single()
    if (error || !message) return reply({error:'Message unavailable'},404)
    // Este aviso fue autorizado para estos dos participantes; no es un mailer genérico.
    if (message.remitente_id !== 'f623e0d3-37b5-4ff4-be4f-cc73c99c85c4' || message.destinatario_id !== 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93') return reply({error:'Not the authorized review'},403)
    if (!message.asunto.startsWith('Revisión provisional de obligaciones') || !message.contenido.includes('PROSEC') || !message.contenido.includes('CERTIVA')) return reply({error:'Not a program review'},400)
    const {data:roles,error:rolesError} = await db.from('user_roles').select('user_id,role').in('user_id',[message.remitente_id,message.destinatario_id])
    if (rolesError) throw rolesError
    if (!roles?.some(r=>r.user_id===message.remitente_id && r.role==='administrador') || !roles.some(r=>r.user_id===message.destinatario_id && r.role==='consultor')) return reply({error:'Invalid participants'},403)
    const {data:{user},error:userError} = await db.auth.admin.getUserById(message.destinatario_id)
    if (userError || !user?.email) throw new Error('Recipient unavailable')
    // La PK reclama el único intento antes de SMTP, incluso con llamadas concurrentes.
    const {error:claimError} = await db.from('revision_programas_envios').insert({mensaje_id,estado:'enviando'})
    if (claimError?.code==='23505') return reply({error:'Already attempted; check delivery before retrying'},409)
    if (claimError) throw claimError
    claimed = mensaje_id
    await sendEmail(user.email,'Revisa la propuesta de obligaciones — Calendario Compliance',
      '<p>Hola, Fernanda:</p><p>Tienes disponible en Mensajes el informe provisional de obligaciones de PROSEC, IMMEX y CERTIVA.</p><p>Por favor revisa qué conservar, modificar o retirar y envía tus comentarios a Sebastián desde Mensajes. Tus observaciones no cambiarán automáticamente el catálogo.</p><p><a href="https://calendario-compliance.lovable.app/mensajes">Entrar a revisar el informe</a></p><p>La propuesta sigue pendiente de tu revisión; no es una certificación de cumplimiento.</p>')
    const {error:saveError} = await db.from('revision_programas_envios').update({estado:'enviado',enviado_en:new Date().toISOString()}).eq('mensaje_id',mensaje_id)
    if (saveError) return reply({error:'SMTP accepted; delivery log requires review'},500)
    return reply({success:true,mensaje_id,smtpAccepted:true})
  } catch {
    if (claimed) await db.from('revision_programas_envios').update({estado:'error'}).eq('mensaje_id',claimed)
    return reply({error:'Delivery failed or uncertain; review before retrying'},500)
  }
})
