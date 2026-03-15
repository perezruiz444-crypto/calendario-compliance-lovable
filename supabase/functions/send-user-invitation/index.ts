import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/smtp.ts';
import { userInvitationTemplate } from '../_shared/email-templates.ts';

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

    // Assign role directly (triggers depend on email confirmation which doesn't happen with recovery links)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userData.user.id, role });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    } else {
      console.log('Role assigned successfully:', role);
    }

    // Generate password setup link first (as backup)
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://3fd50525-4957-433e-99b5-f22cb124e7c8.lovableproject.com'}/set-password`
      }
    });

    const setupLink = resetData?.properties?.action_link || null;
    console.log('Backup setup link:', setupLink ? 'Generated' : 'Failed');

    // Send invitation email via Resend with branded template
    let emailSent = false;
    try {
      const htmlBody = userInvitationTemplate(nombreCompleto, setupLink);
      await sendEmail(email, `Invitación a ${nombreCompleto} - Calendario Compliance`, htmlBody);
      emailSent = true;
      console.log('Invitation email sent successfully via Resend to:', email);
    } catch (emailError: any) {
      console.log('Email sending error:', emailError.message);
      // Fallback: try Supabase Auth invite
      try {
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          email,
          {
            data: userMetadata,
            redirectTo: `${req.headers.get('origin') || 'https://3fd50525-4957-433e-99b5-f22cb124e7c8.lovableproject.com'}/set-password`
          }
        );
        if (!inviteError) {
          emailSent = true;
          console.log('Fallback: Invitation email sent via Supabase Auth');
        }
      } catch (fallbackError: any) {
        console.log('Fallback email also failed:', fallbackError.message);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent 
          ? 'Usuario creado y correo enviado exitosamente.'
          : 'Usuario creado. Comparte el siguiente enlace para que configure su contraseña.',
        invitationId: invitation.id,
        userId: userData.user.id,
        setupLink: setupLink,
        email: email,
        emailSent: emailSent
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
