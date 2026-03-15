import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { testEmailTemplate } from '../_shared/email-templates.ts'

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
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

    // Get the selected user's info
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

    // Build HTML email using template
    const htmlBody = testEmailTemplate(targetUserName, subject, message)

    // Send real email via Resend
    await sendEmail(targetUser.email, subject, htmlBody)

    console.log('Test email sent successfully via SMTP')

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Correo de prueba enviado a ${targetUser.email} via SMTP`,
      sentTo: targetUser.email,
      targetUser: targetUserName,
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
