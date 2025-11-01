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

    // Create user metadata
    const userMetadata: any = {
      nombre_completo: nombreCompleto,
      role: role,
      invitation_token: token
    };

    // Add empresa_id to metadata if provided (for clientes)
    if (empresaId) {
      userMetadata.empresa_id = empresaId;
    }

    // Create user directly without sending email
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // User needs to confirm via password setup link
      user_metadata: userMetadata
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      throw new Error('Error al crear el usuario: ' + createUserError.message);
    }

    console.log('User created successfully:', userData.user.id);

    // Generate password setup link that user can use to set their password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://3fd50525-4957-433e-99b5-f22cb124e7c8.lovableproject.com'}/set-password`
      }
    });

    if (resetError) {
      console.error('Error generating setup link:', resetError);
      // Continue without the link - user can request password reset manually
    }

    console.log('Link generation response:', JSON.stringify(resetData));
    const setupLink = resetData?.properties?.action_link || null;
    console.log('Setup link extracted:', setupLink ? 'YES' : 'NO');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: setupLink 
          ? 'Usuario creado. Comparte el siguiente enlace para que configure su contraseña.'
          : 'Usuario creado correctamente. El link de configuración estará disponible en breve.',
        invitationId: invitation.id,
        userId: userData.user.id,
        setupLink: setupLink, // Link que puedes compartir manualmente
        email: email
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
