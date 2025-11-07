import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportEmailRequest {
  empresaId: string;
  reportData: any;
  period: string;
  reportType: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    const { empresaId, reportData, period, reportType }: ReportEmailRequest = await req.json();

    console.log('Generating report for empresa:', empresaId);

    // Get empresa details
    const { data: empresa, error: empresaError } = await supabaseClient
      .from('empresas')
      .select('razon_social, rfc')
      .eq('id', empresaId)
      .single();

    if (empresaError) throw empresaError;

    // Get cliente users for this empresa
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, nombre_completo')
      .eq('empresa_id', empresaId);

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      throw new Error('No se encontraron clientes para esta empresa');
    }

    // Get user roles to find cliente emails
    const profileIds = profiles.map(p => p.id);
    const { data: userRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'cliente')
      .in('user_id', profileIds);

    if (rolesError) throw rolesError;

    const clienteIds = userRoles?.map(r => r.user_id) || [];

    if (clienteIds.length === 0) {
      throw new Error('No se encontraron usuarios con rol cliente para esta empresa');
    }

    // Get emails from auth.users (we need to use admin client for this)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clienteEmails: string[] = [];
    for (const clienteId of clienteIds) {
      const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(clienteId);
      if (userData?.user?.email) {
        clienteEmails.push(userData.user.email);
      }
    }

    if (clienteEmails.length === 0) {
      throw new Error('No se encontraron emails de clientes');
    }

    console.log('Sending emails to:', clienteEmails);

    // Prepare period text
    const periodText = period === 'mes_actual' ? 'Mes Actual' :
                       period === 'mes_anterior' ? 'Mes Anterior' :
                       period === 'trimestre' ? 'Último Trimestre' :
                       period === 'semestre' ? 'Último Semestre' : 'Año Actual';

    // Prepare email content
    const emailSubject = `📊 Reporte ${reportType} - ${periodText}`;
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #333; margin-bottom: 20px;">Reporte de Tareas</h1>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h2 style="color: #555; font-size: 18px; margin: 0 0 10px 0;">Empresa: ${empresa.razon_social}</h2>
              <p style="color: #666; margin: 5px 0;"><strong>RFC:</strong> ${empresa.rfc}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Período:</strong> ${periodText}</p>
              <p style="color: #666; margin: 5px 0;"><strong>Tipo de Reporte:</strong> ${reportType}</p>
            </div>

            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h3 style="color: #1976d2; font-size: 16px; margin: 0 0 10px 0;">Resumen</h3>
              <p style="color: #555; margin: 5px 0;"><strong>Total de tareas:</strong> ${reportData.resumen.totalTareas}</p>
              <p style="color: #555; margin: 5px 0;"><strong>Tareas completadas:</strong> ${reportData.resumen.tareasCompletadas}</p>
              <p style="color: #555; margin: 5px 0;"><strong>Tareas pendientes:</strong> ${reportData.resumen.tareasPendientes}</p>
              <p style="color: #555; margin: 5px 0;"><strong>Tasa de completitud:</strong> ${reportData.resumen.tasaCompletitud}%</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                Este es un correo automático. Para ver más detalles, accede a tu panel de reportes en la plataforma.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Helper function to send SMTP email
    async function sendSMTPEmail(to: string, subject: string, html: string) {
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpPort = parseInt(Deno.env.get('SMTP_PORT') ?? '587');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPassword = Deno.env.get('SMTP_PASSWORD');
      const smtpFrom = Deno.env.get('SMTP_FROM');

      // Connect to SMTP server
      const conn = await Deno.connect({
        hostname: smtpHost!,
        port: smtpPort,
      });

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      async function readLine() {
        const buffer = new Uint8Array(1024);
        const n = await conn.read(buffer);
        if (!n) return '';
        return decoder.decode(buffer.subarray(0, n));
      }

      async function writeLine(data: string) {
        await conn.write(encoder.encode(data + '\r\n'));
      }

      try {
        // Wait for server greeting
        await readLine();

        // EHLO
        await writeLine(`EHLO ${smtpHost}`);
        await readLine();

        // STARTTLS
        await writeLine('STARTTLS');
        await readLine();

        // Upgrade to TLS
        const tlsConn = await Deno.startTls(conn, { hostname: smtpHost! });

        // EHLO again after TLS
        await tlsConn.write(encoder.encode(`EHLO ${smtpHost}\r\n`));
        const buf1 = new Uint8Array(1024);
        await tlsConn.read(buf1);

        // AUTH LOGIN
        await tlsConn.write(encoder.encode('AUTH LOGIN\r\n'));
        const buf2 = new Uint8Array(1024);
        await tlsConn.read(buf2);

        // Send username (base64)
        await tlsConn.write(encoder.encode(btoa(smtpUser!) + '\r\n'));
        const buf3 = new Uint8Array(1024);
        await tlsConn.read(buf3);

        // Send password (base64)
        await tlsConn.write(encoder.encode(btoa(smtpPassword!) + '\r\n'));
        const buf4 = new Uint8Array(1024);
        await tlsConn.read(buf4);

        // MAIL FROM
        await tlsConn.write(encoder.encode(`MAIL FROM:<${smtpFrom}>\r\n`));
        const buf5 = new Uint8Array(1024);
        await tlsConn.read(buf5);

        // RCPT TO
        await tlsConn.write(encoder.encode(`RCPT TO:<${to}>\r\n`));
        const buf6 = new Uint8Array(1024);
        await tlsConn.read(buf6);

        // DATA
        await tlsConn.write(encoder.encode('DATA\r\n'));
        const buf7 = new Uint8Array(1024);
        await tlsConn.read(buf7);

        // Email content
        const emailContent = [
          `From: ${smtpFrom}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
          '.',
        ].join('\r\n');

        await tlsConn.write(encoder.encode(emailContent + '\r\n'));
        const buf8 = new Uint8Array(1024);
        await tlsConn.read(buf8);

        // QUIT
        await tlsConn.write(encoder.encode('QUIT\r\n'));

        tlsConn.close();
      } catch (error) {
        conn.close();
        throw error;
      }
    }

    // Send email to all cliente emails
    let emailsSent = 0;
    for (const email of clienteEmails) {
      try {
        await sendSMTPEmail(email, emailSubject, emailBody);
        emailsSent++;
        console.log('Email sent to:', email);
      } catch (emailError) {
        console.error('Error sending email to', email, ':', emailError);
      }
    }

    console.log('Creating report notifications for users:', clienteIds);

    // Create notifications for all cliente users
    let notificacionesCreadas = 0;
    for (const clienteId of clienteIds) {
      const { error: notifError } = await supabaseClient
        .from('notificaciones')
        .insert({
          user_id: clienteId,
          tipo: 'reporte',
          titulo: `📊 Reporte ${reportType} - ${periodText}`,
          contenido: `Reporte disponible para ${empresa.razon_social}. ${reportData.resumen.totalTareas} tareas totales, ${reportData.resumen.tareasCompletadas} completadas.`,
          leida: false
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      } else {
        notificacionesCreadas++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailsSent} email(s) enviado(s) y ${notificacionesCreadas} notificación(es) creada(s) para ${clienteIds.length} cliente(s)`,
        emailsSent,
        notificacionesCreadas
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-report-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

