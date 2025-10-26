import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { Resend } from 'https://esm.sh/resend@3.2.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

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

    // Check for pending invitation
    const { data: pendingInvitation } = await supabaseClient
      .from('user_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingInvitation) {
      throw new Error('Ya existe una invitación pendiente para este email');
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

    // Create user directly with admin client
    const inviteMetadata: any = {
      nombre_completo: nombreCompleto,
      role: role,
      invitation_token: token
    };

    // Add empresa_id to metadata if provided (for clientes)
    if (empresaId) {
      inviteMetadata.empresa_id = empresaId;
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: inviteMetadata,
        redirectTo: `https://3fd50525-4957-433e-99b5-f22cb124e7c8.lovableproject.com/set-password`
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      throw new Error('Error al crear el usuario: ' + inviteError.message);
    }

    console.log('User created:', inviteData.user.id);

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `https://3fd50525-4957-433e-99b5-f22cb124e7c8.lovableproject.com/set-password`
      }
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      throw new Error('Error al generar el enlace de invitación: ' + resetError.message);
    }

    // Send custom email using Resend
    const emailHtml = generateInvitationEmail(nombreCompleto, resetData.properties.action_link, role);
    
    const { error: emailError } = await resend.emails.send({
      from: 'Sistema de Gestión <onboarding@resend.dev>',
      to: [email],
      subject: 'Invitación al Sistema de Gestión',
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error('Error al enviar el correo de invitación: ' + emailError.message);
    }

    console.log('Invitation email sent to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitación enviada correctamente por email',
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

function generateInvitationEmail(nombreCompleto: string, actionLink: string, role: string): string {
  const roleText = role === 'admin' ? 'Administrador' : role === 'consultor' ? 'Consultor' : 'Cliente';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f4;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      Bienvenido al Sistema
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #333333;">
                      Hola <strong>${nombreCompleto}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 24px; color: #333333;">
                      Has sido invitado a unirte al Sistema de Gestión con el rol de <strong>${roleText}</strong>.
                    </p>
                    
                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 24px; color: #333333;">
                      Para configurar tu contraseña y acceder al sistema, haz clic en el siguiente botón:
                    </p>
                    
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${actionLink}" 
                             style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Configurar Contraseña
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 20px; color: #666666;">
                      Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; line-height: 18px; color: #999999; word-break: break-all;">
                      ${actionLink}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                      Este enlace expirará en 7 días
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999999;">
                      Si no solicitaste esta invitación, puedes ignorar este correo
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
