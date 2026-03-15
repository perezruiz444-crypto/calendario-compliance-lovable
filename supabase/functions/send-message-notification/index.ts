import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { newMessageTemplate } from '../_shared/email-templates.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { mensaje_id } = await req.json()

    if (!mensaje_id) {
      return new Response(JSON.stringify({ error: 'Missing mensaje_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch message with sender profile
    const { data: mensaje, error: msgError } = await supabaseAdmin
      .from('mensajes')
      .select('asunto, contenido, remitente_id, destinatario_id')
      .eq('id', mensaje_id)
      .single()

    if (msgError || !mensaje) {
      console.error('Error fetching mensaje:', msgError)
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch sender and recipient profiles + recipient email in parallel
    const [senderResult, recipientResult, recipientUserResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('nombre_completo').eq('id', mensaje.remitente_id).single(),
      supabaseAdmin.from('profiles').select('nombre_completo').eq('id', mensaje.destinatario_id).single(),
      supabaseAdmin.auth.admin.getUserById(mensaje.destinatario_id),
    ])

    const senderName = senderResult.data?.nombre_completo || 'Usuario'
    const recipientName = recipientResult.data?.nombre_completo || 'Usuario'
    const recipientEmail = recipientUserResult.data?.user?.email

    if (!recipientEmail) {
      console.error('Recipient has no email')
      return new Response(JSON.stringify({ error: 'Recipient has no email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const htmlBody = newMessageTemplate(recipientName, senderName, mensaje.asunto, mensaje.contenido)
    await sendEmail(recipientEmail, `Nuevo mensaje: ${mensaje.asunto}`, htmlBody)

    console.log(`Message notification sent to ${recipientEmail}`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in send-message-notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
