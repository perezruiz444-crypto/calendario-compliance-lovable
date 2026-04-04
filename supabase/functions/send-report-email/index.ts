import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { reportEmailTemplate } from '../_shared/email-templates.ts'

interface ReportEmailRequest {
  empresaId: string;
  reportData: any;
  period: string;
  reportType: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    // Get emails from auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clienteEmails: { email: string; name: string }[] = [];
    for (const clienteId of clienteIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(clienteId);
      const profile = profiles.find(p => p.id === clienteId);
      if (userData?.user?.email) {
        clienteEmails.push({
          email: userData.user.email,
          name: profile?.nombre_completo || userData.user.email
        });
      }
    }

    if (clienteEmails.length === 0) {
      throw new Error('No se encontraron emails de clientes');
    }

    // Prepare period text
    const periodText = period === 'mes_actual' ? 'Mes Actual' :
                       period === 'mes_anterior' ? 'Mes Anterior' :
                       period === 'trimestre' ? 'Último Trimestre' :
                       period === 'semestre' ? 'Último Semestre' : 'Año Actual';

    // Prepare email content using template
    const emailSubject = `📊 Reporte ${reportType} - ${periodText}`;
    const emailBody = reportEmailTemplate(
      { razonSocial: empresa.razon_social, rfc: empresa.rfc },
      periodText,
      reportType,
      reportData.resumen
    );

    // Send real email via Resend to all clientes
    let emailsSent = 0;
    for (const cliente of clienteEmails) {
      try {
        console.log(`Sending report email via SMTP to ${cliente.email}`);
        await sendEmail(cliente.email, emailSubject, emailBody);
        emailsSent++;
        console.log('Email sent successfully to:', cliente.email);
      } catch (emailError) {
        console.error('Error sending email to', cliente.email, ':', emailError);
      }
    }

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
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})
