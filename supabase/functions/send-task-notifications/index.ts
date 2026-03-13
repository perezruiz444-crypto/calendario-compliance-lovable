import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'

interface TaskNotificationRequest {
  tareaId?: string;
  consultorId?: string;
  type: 'reminder' | 'assignment' | 'overdue';
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

    const { tareaId, consultorId, type }: TaskNotificationRequest = await req.json();

    console.log('Sending task notification:', { tareaId, consultorId, type });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let tareas: any[] = [];

    if (tareaId) {
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

    let notificacionesCreadas = 0;
    let emailsEnviados = 0;

    for (const [cId, consultorTareas] of Object.entries(tareasPorConsultor)) {
      const notificationType = type === 'reminder' ? 'recordatorio_tarea' :
                               type === 'assignment' ? 'tarea_asignada' :
                               'tarea_vencida';
      
      const titulo = type === 'reminder' ? '🔔 Recordatorio de Tareas Pendientes' :
                     type === 'assignment' ? '✅ Nueva Tarea Asignada' :
                     '⚠️ Tareas Vencidas';

      // Create in-app notifications
      for (const tarea of consultorTareas) {
        const { error: notifError } = await supabaseClient
          .from('notificaciones')
          .insert({
            user_id: cId,
            tipo: notificationType,
            titulo: titulo,
            contenido: tarea.titulo,
            referencia_id: tarea.id,
            referencia_tipo: 'tarea',
            leida: false
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        } else {
          notificacionesCreadas++;
        }
      }

      // Send real email to the consultor
      try {
        const { data: { user: consultorUser } } = await supabaseAdmin.auth.admin.getUserById(cId);
        const { data: consultorProfile } = await supabaseAdmin
          .from('profiles')
          .select('nombre_completo')
          .eq('id', cId)
          .single();

        if (consultorUser?.email) {
          const consultorName = consultorProfile?.nombre_completo || consultorUser.email;

          // Build tasks table rows
          const tareasRows = consultorTareas.map(t => {
            const prioridadColor = t.prioridad === 'alta' ? '#e53e3e' : t.prioridad === 'media' ? '#d69e2e' : '#38a169';
            const fechaVenc = t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString('es-MX') : 'Sin fecha';
            return `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; color: #333;">${t.titulo}</td>
                <td style="padding: 10px; color: #666;">${(t.empresas as any)?.razon_social || '-'}</td>
                <td style="padding: 10px;"><span style="color: ${prioridadColor}; font-weight: bold;">${t.prioridad || '-'}</span></td>
                <td style="padding: 10px; color: #666;">${fechaVenc}</td>
              </tr>`;
          }).join('');

          const htmlBody = `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h1 style="color: #333; margin-bottom: 10px;">${titulo}</h1>
                  <p style="color: #555; font-size: 16px;">Hola ${consultorName},</p>
                  <p style="color: #666; font-size: 14px;">Tienes ${consultorTareas.length} tarea(s) que requieren tu atención:</p>
                  
                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                      <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 10px; text-align: left; color: #555;">Tarea</th>
                        <th style="padding: 10px; text-align: left; color: #555;">Empresa</th>
                        <th style="padding: 10px; text-align: left; color: #555;">Prioridad</th>
                        <th style="padding: 10px; text-align: left; color: #555;">Vencimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${tareasRows}
                    </tbody>
                  </table>

                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #999; font-size: 12px;">
                      Este es un correo automático de la plataforma de Compliance. Accede a tu panel para más detalles.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `;

          await sendEmail(consultorUser.email, titulo, htmlBody);
          emailsEnviados++;
          console.log(`Email sent to ${consultorUser.email}`);
        }
      } catch (emailError: any) {
        console.error(`Error sending email to consultor ${cId}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${notificacionesCreadas} notificación(es) creada(s), ${emailsEnviados} email(s) enviado(s)`,
        notificacionesCreadas,
        emailsEnviados
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
})
