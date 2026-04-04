import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { taskNotificationTemplate } from '../_shared/email-templates.ts'

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

          const tareasData = consultorTareas.map(t => ({
            titulo: t.titulo,
            empresa: (t.empresas as any)?.razon_social || '-',
            prioridad: t.prioridad || '-',
            fechaVencimiento: t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString('es-MX') : 'Sin fecha',
          }));

          const htmlBody = taskNotificationTemplate(consultorName, titulo, tareasData);
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
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
})
