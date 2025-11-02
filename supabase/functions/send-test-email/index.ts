import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { Resend } from 'https://esm.sh/resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

interface TestEmailRequest {
  userId: string;
  subject: string;
  message: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin or consultor
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['administrador', 'consultor'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin or Consultor role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId, subject, message }: TestEmailRequest = await req.json()

    if (!userId || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, subject, message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the selected user's info (for display purposes)
    const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !targetUser?.email) {
      console.error('Error fetching target user:', userError)
      return new Response(JSON.stringify({ error: 'User not found or has no email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get target user profile for name
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('nombre_completo')
      .eq('id', userId)
      .single()

    const targetUserName = targetProfile?.nombre_completo || targetUser.email

    // Get current user's email (the one who is authenticated)
    // In sandbox mode, Resend only allows sending to the registered email
    const { data: { user: currentAuthUser } } = await supabaseAdmin.auth.admin.getUserById(user.id)
    const senderEmail = currentAuthUser?.email || user.email

    if (!senderEmail) {
      return new Response(JSON.stringify({ error: 'Could not determine sender email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send test email using Resend - to the authenticated user's email
    console.log(`Sending test email to ${senderEmail} (about user: ${targetUserName})`)
    
    const emailResponse = await resend.emails.send({
      from: 'Sistema de Gestión <onboarding@resend.dev>',
      to: [senderEmail],
      subject: `[PRUEBA] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Correo de Prueba</strong><br/>
              Este correo se envía a tu dirección (${senderEmail}) porque Resend está en modo sandbox.
              Para enviar a otros destinatarios, verifica un dominio en <a href="https://resend.com/domains">resend.com/domains</a>.
            </p>
          </div>
          <h2 style="color: #333;">Prueba de correo para: ${targetUserName}</h2>
          <p style="color: #666; font-size: 14px;">Usuario seleccionado: <strong>${targetUser.email}</strong></p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          <p style="color: #888; font-size: 12px;">
            Este es un correo de prueba enviado desde el Sistema de Gestión.
          </p>
        </div>
      `,
    })

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error)
      return new Response(JSON.stringify({ error: 'Failed to send email', details: emailResponse.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Email sent successfully:', emailResponse)

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent to ${senderEmail} (sandbox mode)`,
      emailId: emailResponse.data?.id,
      sentTo: senderEmail,
      targetUser: targetUserName
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in send-test-email function:', error)
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})