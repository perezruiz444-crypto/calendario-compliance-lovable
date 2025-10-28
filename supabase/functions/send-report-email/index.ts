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

    console.log('Creating report notifications for users:', clienteIds);

    // Create notifications for all cliente users
    const periodText = period === 'mes_actual' ? 'Mes Actual' :
                       period === 'mes_anterior' ? 'Mes Anterior' :
                       period === 'trimestre' ? 'Último Trimestre' :
                       period === 'semestre' ? 'Último Semestre' : 'Año Actual';

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
        message: `${notificacionesCreadas} notificación(es) creada(s) para ${clienteIds.length} cliente(s)`,
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

