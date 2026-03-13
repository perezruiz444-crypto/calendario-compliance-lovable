import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { dailySummaryTemplate } from '../_shared/email-templates.ts'

interface DailySummaryData {
  pendingTasks: number
  overdueTasks: number
  upcomingDeadlines: number
  expiringCertifications: number
  expiringDocuments: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting daily summary email job...')

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre_completo, notificaciones_activas')
      .eq('notificaciones_activas', true)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Found ${profiles?.length || 0} users with notifications enabled`)

    let emailsSent = 0
    let emailsFailed = 0
    const today = new Date().toISOString().split('T')[0]
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    for (const profile of profiles || []) {
      try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        
        if (userError || !user?.email) {
          console.error(`User ${profile.id} not found or has no email`)
          emailsFailed++
          continue
        }

        // Get user's pending tasks
        const { data: pendingTasks } = await supabaseAdmin
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .or(`creado_por.eq.${profile.id},consultor_asignado_id.eq.${profile.id}`)
          .eq('estado', 'pendiente')

        // Get overdue tasks
        const { data: overdueTasks } = await supabaseAdmin
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .or(`creado_por.eq.${profile.id},consultor_asignado_id.eq.${profile.id}`)
          .eq('estado', 'pendiente')
          .lt('fecha_vencimiento', today)

        // Get upcoming task deadlines (next 7 days)
        const { data: upcomingTasks } = await supabaseAdmin
          .from('tareas')
          .select('id', { count: 'exact', head: true })
          .or(`creado_por.eq.${profile.id},consultor_asignado_id.eq.${profile.id}`)
          .eq('estado', 'pendiente')
          .gte('fecha_vencimiento', today)
          .lte('fecha_vencimiento', next7Days)

        const { data: userRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle()

        let expiringDocs = 0
        let expiringCerts = 0

        if (userRoles?.role === 'administrador' || userRoles?.role === 'consultor') {
          const { data: empresas } = await supabaseAdmin
            .from('empresas')
            .select('id, immex_fecha_fin, prosec_fecha_fin, cert_iva_ieps_fecha_vencimiento, matriz_seguridad_fecha_vencimiento')

          for (const empresa of empresas || []) {
            if (empresa.immex_fecha_fin && empresa.immex_fecha_fin <= next7Days) expiringCerts++
            if (empresa.prosec_fecha_fin && empresa.prosec_fecha_fin <= next7Days) expiringCerts++
            if (empresa.cert_iva_ieps_fecha_vencimiento && empresa.cert_iva_ieps_fecha_vencimiento <= next7Days) expiringCerts++
            if (empresa.matriz_seguridad_fecha_vencimiento && empresa.matriz_seguridad_fecha_vencimiento <= next7Days) expiringCerts++

            const { count: docsCount } = await supabaseAdmin
              .from('documentos')
              .select('id', { count: 'exact', head: true })
              .eq('empresa_id', empresa.id)
              .not('fecha_vencimiento', 'is', null)
              .gte('fecha_vencimiento', today)
              .lte('fecha_vencimiento', next7Days)

            expiringDocs += docsCount || 0
          }
        } else if (userRoles?.role === 'cliente') {
          const { data: clientProfile } = await supabaseAdmin
            .from('profiles')
            .select('empresa_id')
            .eq('id', profile.id)
            .maybeSingle()

          if (clientProfile?.empresa_id) {
            const { data: empresa } = await supabaseAdmin
              .from('empresas')
              .select('immex_fecha_fin, prosec_fecha_fin, cert_iva_ieps_fecha_vencimiento, matriz_seguridad_fecha_vencimiento')
              .eq('id', clientProfile.empresa_id)
              .maybeSingle()

            if (empresa) {
              if (empresa.immex_fecha_fin && empresa.immex_fecha_fin <= next7Days) expiringCerts++
              if (empresa.prosec_fecha_fin && empresa.prosec_fecha_fin <= next7Days) expiringCerts++
              if (empresa.cert_iva_ieps_fecha_vencimiento && empresa.cert_iva_ieps_fecha_vencimiento <= next7Days) expiringCerts++
              if (empresa.matriz_seguridad_fecha_vencimiento && empresa.matriz_seguridad_fecha_vencimiento <= next7Days) expiringCerts++
            }

            const { count: docsCount } = await supabaseAdmin
              .from('documentos')
              .select('id', { count: 'exact', head: true })
              .eq('empresa_id', clientProfile.empresa_id)
              .not('fecha_vencimiento', 'is', null)
              .gte('fecha_vencimiento', today)
              .lte('fecha_vencimiento', next7Days)

            expiringDocs = docsCount || 0
          }
        }

        const summaryData: DailySummaryData = {
          pendingTasks: pendingTasks?.length || 0,
          overdueTasks: overdueTasks?.length || 0,
          upcomingDeadlines: upcomingTasks?.length || 0,
          expiringCertifications: expiringCerts,
          expiringDocuments: expiringDocs
        }

        const hasActivity = summaryData.pendingTasks > 0 || 
                           summaryData.overdueTasks > 0 || 
                           summaryData.upcomingDeadlines > 0 || 
                           summaryData.expiringCertifications > 0 || 
                           summaryData.expiringDocuments > 0

        if (!hasActivity) {
          console.log(`No activity for user ${profile.nombre_completo}, skipping email`)
          continue
        }

        // Build summary HTML email
        const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; margin-bottom: 20px;">📋 Resumen Diario de Actividades</h1>
                <p style="color: #555; font-size: 16px;">Hola ${profile.nombre_completo},</p>
                <p style="color: #666; font-size: 14px;">Aquí tienes tu resumen de actividades pendientes:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  ${summaryData.overdueTasks > 0 ? `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #e53e3e; font-weight: bold;">⚠️ Tareas Vencidas</td>
                    <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #e53e3e;">${summaryData.overdueTasks}</td>
                  </tr>` : ''}
                  ${summaryData.pendingTasks > 0 ? `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #555;">📝 Tareas Pendientes</td>
                    <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #333;">${summaryData.pendingTasks}</td>
                  </tr>` : ''}
                  ${summaryData.upcomingDeadlines > 0 ? `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #555;">🔔 Tareas próximas a vencer (7 días)</td>
                    <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #d69e2e;">${summaryData.upcomingDeadlines}</td>
                  </tr>` : ''}
                  ${summaryData.expiringCertifications > 0 ? `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #555;">📜 Certificaciones próximas a vencer</td>
                    <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #d69e2e;">${summaryData.expiringCertifications}</td>
                  </tr>` : ''}
                  ${summaryData.expiringDocuments > 0 ? `
                  <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px; color: #555;">📄 Documentos próximos a vencer</td>
                    <td style="padding: 12px; text-align: right; font-size: 20px; font-weight: bold; color: #d69e2e;">${summaryData.expiringDocuments}</td>
                  </tr>` : ''}
                </table>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Este es un correo automático generado por la plataforma de Compliance. Accede a tu panel para más detalles.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `

        // Send real email via SMTP
        console.log(`Sending daily summary to ${user.email}`)
        
        try {
          await sendEmail(user.email, '📋 Resumen Diario de Actividades', htmlBody)
          console.log(`Successfully sent email to ${user.email}`)
          emailsSent++
        } catch (emailError: any) {
          console.error(`Failed to send email to ${user.email}:`, emailError)
          emailsFailed++
        }

        // Create in-app notification regardless of email result
        const summaryParts = []
        if (summaryData.overdueTasks > 0) summaryParts.push(`${summaryData.overdueTasks} tarea(s) vencida(s)`)
        if (summaryData.upcomingDeadlines > 0) summaryParts.push(`${summaryData.upcomingDeadlines} tarea(s) próxima(s) a vencer`)
        if (summaryData.expiringCertifications > 0) summaryParts.push(`${summaryData.expiringCertifications} certificación(es) próxima(s) a vencer`)
        if (summaryData.expiringDocuments > 0) summaryParts.push(`${summaryData.expiringDocuments} documento(s) próximo(s) a vencer`)

        await supabaseAdmin
          .from('notificaciones')
          .insert({
            user_id: profile.id,
            tipo: 'resumen_diario',
            titulo: 'Resumen Diario',
            contenido: summaryParts.join(', '),
            referencia_tipo: 'sistema'
          })

      } catch (userError: any) {
        console.error(`Error processing user ${profile.id}:`, userError)
        emailsFailed++
      }
    }

    console.log(`Daily summary job completed: ${emailsSent} sent, ${emailsFailed} failed`)

    return new Response(JSON.stringify({ 
      success: true,
      emailsSent,
      emailsFailed,
      totalUsers: profiles?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error in send-daily-summary function:', error)
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
