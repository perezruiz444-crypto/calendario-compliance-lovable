import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';



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

    let notificacionesCreadas = 0;

    // Create notifications for each consultor
    for (const [consultorId, consultorTareas] of Object.entries(tareasPorConsultor)) {
      const notificationType = type === 'reminder' ? 'recordatorio_tarea' :
                               type === 'assignment' ? 'tarea_asignada' :
                               'tarea_vencida';
      
      const titulo = type === 'reminder' ? '🔔 Recordatorio de Tareas Pendientes' :
                     type === 'assignment' ? '✅ Nueva Tarea Asignada' :
                     '⚠️ Tareas Vencidas';
      
      const contenido = `Tienes ${consultorTareas.length} tarea(s) que requieren tu atención.`;

      // Create notification for each task
      for (const tarea of consultorTareas) {
        const { error: notifError } = await supabaseClient
          .from('notificaciones')
          .insert({
            user_id: consultorId,
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
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${notificacionesCreadas} notificación(es) creada(s)`,
        notificacionesCreadas 
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

