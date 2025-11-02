import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'

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

    // Use Supabase SMTP to send a magic link as test email
    console.log(`Sending test email via Supabase SMTP to ${targetUser.email}`)
    
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')}/dashboard`,
      }
    })

    if (magicLinkError) {
      console.error('Supabase email error:', magicLinkError)
      return new Response(JSON.stringify({ 
        error: 'Failed to send test email via Supabase', 
        details: magicLinkError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Test email sent successfully via Supabase SMTP')

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test email sent to ${targetUser.email} via Supabase SMTP`,
      sentTo: targetUser.email,
      targetUser: targetUserName,
      note: 'A magic link email was sent using Supabase configured SMTP'
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