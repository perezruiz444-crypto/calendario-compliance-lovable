import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskNotificationRequest {
  tareaId?: string;
  consultorId?: string;
  type: 'reminder' | 'assignment' | 'overdue';
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

    const { tareaId, consultorId, type }: TaskNotificationRequest = await req.json();

    console.log('Sending task notification:', { tareaId, consultorId, type });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let tareas: any[] = [];

    if (tareaId) {
      // Send notification for specific task
      const { data, error } = await supabaseClient
        .from('tareas')
        .select(`
          id,
          titulo,
          descripcion,
          fecha_vencimiento,
          prioridad,
          estado,
          consultor_asignado_id,
          empresa_id,
          empresas (razon_social)
        `)
        .eq('id', tareaId)
        .single();

      if (error) throw error;
      tareas = [data];
    } else if (consultorId) {
      // Send notification for all pending tasks of a consultor
      const { data, error } = await supabaseClient
        .from('tareas')
        .select(`
          id,
          titulo,
          descripcion,
          fecha_vencimiento,
          prioridad,
          estado,
          consultor_asignado_id,
          empresa_id,
          empresas (razon_social)
        `)
        .eq('consultor_asignado_id', consultorId)
        .in('estado', ['pendiente', 'en_progreso']);

      if (error) throw error;
      tareas = data || [];
    } else {
      throw new Error('Either tareaId or consultorId must be provided');
    }

    if (tareas.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No hay tareas para notificar' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Group tasks by consultor
    const tareasPorConsultor: { [key: string]: any[] } = {};
    for (const tarea of tareas) {
      if (tarea.consultor_asignado_id) {
        if (!tareasPorConsultor[tarea.consultor_asignado_id]) {
          tareasPorConsultor[tarea.consultor_asignado_id] = [];
        }
        tareasPorConsultor[tarea.consultor_asignado_id].push(tarea);
      }
    }

    let emailsSent = 0;

    // Send emails to each consultor
    for (const [consultorId, consultorTareas] of Object.entries(tareasPorConsultor)) {
      // Get consultor profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('nombre_completo')
        .eq('id', consultorId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        continue;
      }

      // Get consultor email
      const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(consultorId);
      if (userDataError || !userData?.user?.email) {
        console.error('Error fetching user email:', userDataError);
        continue;
      }

      const consultorEmail = userData.user.email;
      const consultorNombre = profile?.nombre_completo || 'Consultor';

      // Generate email content
      const htmlContent = generateNotificationEmail(consultorNombre, consultorTareas, type);

      // Send email
      const subject = type === 'reminder' ? '🔔 Recordatorio de Tareas Pendientes' :
                     type === 'assignment' ? '✅ Nueva Tarea Asignada' :
                     '⚠️ Tareas Vencidas';

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
        from: 'Notificaciones <onboarding@resend.dev>',
        to: [consultorEmail],
        subject: subject,
        html: htmlContent
        })
      });

      if (!emailResponse.ok) {
        const error = await emailResponse.text();
        console.error('Error sending email to', consultorEmail, error);
      } else {
        console.log('Email sent successfully to:', consultorEmail);
        emailsSent++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificaciones enviadas a ${emailsSent} consultor(es)`,
        emailsSent 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-task-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateNotificationEmail(consultorNombre: string, tareas: any[], type: string): string {
  const prioridadColors: { [key: string]: string } = {
    baja: '#22c55e',
    media: '#f59e0b',
    alta: '#ef4444',
    urgente: '#dc2626'
  };

  const estadoLabels: { [key: string]: string } = {
    pendiente: 'Pendiente',
    en_progreso: 'En Progreso',
    completada: 'Completada',
    cancelada: 'Cancelada'
  };

  const prioridadLabels: { [key: string]: string } = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente'
  };

  let headerMessage = '';
  let headerColor = '';

  if (type === 'reminder') {
    headerMessage = `Tienes ${tareas.length} tarea(s) pendiente(s) que requieren tu atención.`;
    headerColor = '#1e40af';
  } else if (type === 'assignment') {
    headerMessage = `Se te ha(n) asignado ${tareas.length} nueva(s) tarea(s).`;
    headerColor = '#22c55e';
  } else if (type === 'overdue') {
    headerMessage = `Tienes ${tareas.length} tarea(s) vencida(s) que necesitan atención urgente.`;
    headerColor = '#dc2626';
  }

  const tareasHtml = tareas.map(tarea => {
    const fechaVencimiento = tarea.fecha_vencimiento 
      ? new Date(tarea.fecha_vencimiento).toLocaleDateString('es-MX', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'Sin fecha';

    const diasRestantes = tarea.fecha_vencimiento 
      ? Math.ceil((new Date(tarea.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const urgenciaText = diasRestantes !== null 
      ? diasRestantes < 0 
        ? `<span style="color: #dc2626; font-weight: bold;">Vencida hace ${Math.abs(diasRestantes)} días</span>`
        : diasRestantes === 0
        ? `<span style="color: #dc2626; font-weight: bold;">Vence hoy</span>`
        : diasRestantes <= 3
        ? `<span style="color: #f59e0b; font-weight: bold;">Vence en ${diasRestantes} días</span>`
        : `<span style="color: #64748b;">Vence en ${diasRestantes} días</span>`
      : '';

    return `
      <div style="background-color: #f8f9fa; padding: 20px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid ${prioridadColors[tarea.prioridad] || '#94a3b8'};">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <h3 style="margin: 0; color: #1e293b; font-size: 18px;">${tarea.titulo}</h3>
          <span style="background-color: ${prioridadColors[tarea.prioridad] || '#94a3b8'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            ${prioridadLabels[tarea.prioridad] || tarea.prioridad}
          </span>
        </div>
        
        ${tarea.descripcion ? `
          <p style="color: #64748b; margin: 10px 0; font-size: 14px;">${tarea.descripcion}</p>
        ` : ''}
        
        <div style="margin-top: 15px; display: grid; gap: 8px; font-size: 14px;">
          <div style="color: #475569;">
            <strong>Empresa:</strong> ${tarea.empresas?.razon_social || 'N/A'}
          </div>
          <div style="color: #475569;">
            <strong>Estado:</strong> ${estadoLabels[tarea.estado] || tarea.estado}
          </div>
          <div style="color: #475569;">
            <strong>Fecha de vencimiento:</strong> ${fechaVencimiento}
            ${urgenciaText ? `<br>${urgenciaText}` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notificación de Tareas</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px; padding: 30px; background-color: ${headerColor}; border-radius: 8px; color: white;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px;">👋 Hola ${consultorNombre}</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.95;">${headerMessage}</p>
      </div>

      <div style="margin-bottom: 30px;">
        ${tareasHtml}
      </div>

      <div style="text-align: center; padding: 20px; background-color: #f1f5f9; border-radius: 8px; margin-top: 30px;">
        <p style="margin: 0 0 15px 0; color: #475569; font-size: 14px;">
          Inicia sesión para ver más detalles y gestionar tus tareas
        </p>
        <a href="${Deno.env.get('SUPABASE_URL')}" style="display: inline-block; padding: 12px 30px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ir al Sistema
        </a>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
        <p>Esta notificación fue generada automáticamente. Por favor no responda a este correo.</p>
      </div>
    </body>
    </html>
  `;
}
