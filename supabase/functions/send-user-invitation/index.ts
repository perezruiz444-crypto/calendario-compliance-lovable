import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: string;
  nombreCompleto: string;
  empresaId?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, role, nombreCompleto, empresaId }: InvitationRequest = await req.json();

    console.log('Creating invitation for:', email);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users.some(u => u.email === email);
    
    if (userExists) {
      throw new Error('Ya existe un usuario con este email');
    }

    // Check for pending invitation and delete old ones
    const { data: pendingInvitations } = await supabaseAdmin
      .from('user_invitations')
      .select('id, status, expires_at')
      .eq('email', email)
      .eq('status', 'pending');

    if (pendingInvitations && pendingInvitations.length > 0) {
      console.log(`Found ${pendingInvitations.length} pending invitations for ${email}, deleting them...`);
      
      // Delete old pending invitations to allow new one
      await supabaseAdmin
        .from('user_invitations')
        .delete()
        .eq('email', email)
        .eq('status', 'pending');
    }

    // Generate unique token for tracking
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation record for tracking
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('user_invitations')
      .insert({
        email,
        role,
        nombre_completo: nombreCompleto,
        empresa_id: empresaId,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (invitationError) throw invitationError;

    console.log('Invitation created:', invitation.id);

    // Create user with invitation - Supabase will send the default email
    const inviteMetadata: any = {
      nombre_completo: nombreCompleto,
      role: role,
      invitation_token: token
    };

    // Add empresa_id to metadata if provided (for clientes)
    if (empresaId) {
      inviteMetadata.empresa_id = empresaId;
    }

    // Get the correct frontend URL from request headers
    // Priority: origin header > referer header > fallback to Lovable preview
    let origin = req.headers.get('origin');
    
    if (!origin) {
      const referer = req.headers.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          origin = `${url.protocol}//${url.host}`;
        } catch (e) {
          console.log('Failed to parse referer:', referer);
        }
      }
    }
    
    // Fallback to Lovable preview URL if no origin detected
    if (!origin) {
      origin = 'https://svozqrjhwaohfmbkhpig.lovable.app';
    }
    
    const redirectUrl = `${origin}/set-password`;
    
    console.log('Invitation details:', {
      origin,
      redirectUrl,
      hasOriginHeader: !!req.headers.get('origin'),
      hasRefererHeader: !!req.headers.get('referer')
    });
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: inviteMetadata,
        redirectTo: redirectUrl
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      throw new Error('Error al crear el usuario: ' + inviteError.message);
    }

    console.log('User invited successfully. Email sent by Supabase to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitación enviada correctamente. El usuario recibirá un email para configurar su contraseña.',
        invitationId: invitation.id,
        userId: inviteData.user.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-user-invitation function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
