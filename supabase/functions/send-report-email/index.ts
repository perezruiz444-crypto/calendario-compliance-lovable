import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



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

    console.log('Sending report to emails:', clienteEmails);

    // Generate HTML report
    const htmlReport = generateHtmlReport(empresa, reportData, period, reportType);

    // Send email to all cliente users
    for (const email of clienteEmails) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        from: 'Reportes <onboarding@resend.dev>',
        to: [email],
        subject: `Reporte ${reportType} - ${empresa.razon_social}`,
        html: htmlReport
        })
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error('Error sending email to', email, error);
      } else {
        console.log('Email sent successfully to:', email);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Reporte enviado a ${clienteEmails.length} cliente(s)`,
        recipients: clienteEmails.length
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

function generateHtmlReport(empresa: any, reportData: any, period: string, reportType: string): string {
  const periodText = period === 'mes_actual' ? 'Mes Actual' :
                     period === 'mes_anterior' ? 'Mes Anterior' :
                     period === 'trimestre' ? 'Último Trimestre' :
                     period === 'semestre' ? 'Último Semestre' : 'Año Actual';

  let reportContent = '';

  // Resumen
  reportContent += `
    <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
      <h2 style="color: #1e40af; margin-bottom: 20px;">📊 Resumen</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Total Tareas</div>
          <div style="font-size: 28px; font-weight: bold; color: #1e40af;">${reportData.resumen.totalTareas}</div>
        </div>
        <div style="padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Completadas</div>
          <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${reportData.resumen.tareasCompletadas}</div>
        </div>
        <div style="padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Pendientes</div>
          <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${reportData.resumen.tareasPendientes}</div>
        </div>
        <div style="padding: 15px; background: white; border-radius: 6px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 5px;">Tasa Completitud</div>
          <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${reportData.resumen.tasaCompletitud}%</div>
        </div>
      </div>
    </div>
  `;

  // Tareas por estado
  if (reportData.tareasPorEstado.length > 0) {
    reportContent += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1e40af; margin-bottom: 15px;">📋 Tareas por Estado</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Estado</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.tareasPorEstado.map((item: any) => `
              <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.name}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">${item.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Tareas por prioridad
  if (reportData.tareasPorPrioridad.length > 0) {
    reportContent += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #1e40af; margin-bottom: 15px;">⚡ Tareas por Prioridad</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Prioridad</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.tareasPorPrioridad.map((item: any) => `
              <tr>
                <td style="padding: 12px; border: 1px solid #e2e8f0;">${item.name}</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold;">${item.value}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Certificaciones próximas a vencer
  if (reportData.certificacionesVencimiento.length > 0) {
    reportContent += `
      <div style="margin-bottom: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <h2 style="color: #92400e; margin-bottom: 15px;">⚠️ Certificaciones Próximas a Vencer</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #fef3c7;">
              <th style="padding: 12px; text-align: left; border: 1px solid #fcd34d;">Tipo</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #fcd34d;">Fecha Vencimiento</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #fcd34d;">Días Restantes</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.certificacionesVencimiento.map((cert: any) => `
              <tr>
                <td style="padding: 12px; border: 1px solid #fcd34d;">${cert.tipo}</td>
                <td style="padding: 12px; border: 1px solid #fcd34d;">${cert.fecha_vencimiento}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #fcd34d; font-weight: bold; color: #dc2626;">${cert.dias_restantes}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte ${reportType}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1e40af;">
        <h1 style="color: #1e40af; margin-bottom: 10px; font-size: 32px;">Reporte de Gestión</h1>
        <div style="color: #64748b; font-size: 16px;">
          <strong>${empresa.razon_social}</strong><br>
          RFC: ${empresa.rfc}<br>
          Período: ${periodText}<br>
          Tipo: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}
        </div>
      </div>

      ${reportContent}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 14px;">
        <p>Este reporte fue generado automáticamente el ${new Date().toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p>Para más información, inicie sesión en su cuenta.</p>
      </div>
    </body>
    </html>
  `;
}
