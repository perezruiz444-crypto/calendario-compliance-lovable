import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create invitation record
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

    // Generate invitation URL
    const baseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const projectId = baseUrl.replace('https://', '').replace('.supabase.co', '');
    const invitationUrl = `https://${projectId}.lovableproject.com/accept-invitation?token=${token}`;

    // Generate HTML email
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitación al Sistema</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0 0 10px 0; font-size: 28px;">✉️ Invitación al Sistema</h1>
            <p style="color: #64748b; margin: 0; font-size: 16px;">Sistema de Gestión de Tareas y Empresas</p>
          </div>

          <div style="background-color: #f1f5f9; border-left: 4px solid #1e40af; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">
              <strong>Hola ${nombreCompleto},</strong>
            </p>
            <p style="margin: 0; color: #475569; font-size: 14px;">
              Has sido invitado a unirte al sistema como <strong>${role === 'consultor' ? 'Consultor' : role === 'cliente' ? 'Cliente' : 'Usuario'}</strong>.
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">
              Para completar tu registro y establecer tu contraseña, haz clic en el botón de abajo:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="display: inline-block; padding: 14px 32px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Aceptar Invitación
              </a>
            </div>

            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
              O copia y pega este enlace en tu navegador:<br>
              <a href="${invitationUrl}" style="color: #1e40af; word-break: break-all;">${invitationUrl}</a>
            </p>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 13px;">
              ⏰ <strong>Esta invitación expira en 7 días.</strong> Asegúrate de completar tu registro antes de que expire.
            </p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Sistema de Gestión <onboarding@resend.dev>',
        to: [email],
        subject: '✉️ Invitación al Sistema - Completa tu Registro',
        html: htmlEmail
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Error sending email:', error);
      throw new Error('Error al enviar el email de invitación');
    }

    console.log('Invitation email sent to:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitación enviada correctamente',
        invitationId: invitation.id
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
