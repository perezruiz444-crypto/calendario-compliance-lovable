import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { weeklySummaryTemplate } from '../_shared/email-templates.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre_completo, notificaciones_activas')
      .eq('notificaciones_activas', true)

    let emailsSent = 0
    let emailsFailed = 0

    for (const profile of profiles || []) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        if (!user?.email) continue

        const { data: roleData } = await supabaseAdmin
          .from('user_roles').select('role').eq('user_id', profile.id).maybeSingle()
        const role = roleData?.role || 'cliente'

        // ── Tareas ──────────────────────────────────────────────────
        const { data: tareasVencidas } = await supabaseAdmin
          .from('tareas')
          .select('titulo, fecha_vencimiento, empresas(razon_social)')
          .or(`creado_por.eq.${profile.id},consultor_asignado_id.eq.${profile.id}`)
          .in('estado', ['pendiente', 'en_progreso'])
          .lt('fecha_vencimiento', today)
          .order('fecha_vencimiento', { ascending: true })
          .limit(10)

        const { data: tareasSemana } = await supabaseAdmin
          .from('tareas')
          .select('titulo, fecha_vencimiento, prioridad, empresas(razon_social)')
          .or(`creado_por.eq.${profile.id},consultor_asignado_id.eq.${profile.id}`)
          .in('estado', ['pendiente', 'en_progreso'])
          .gte('fecha_vencimiento', today)
          .lte('fecha_vencimiento', next7Days)
          .order('fecha_vencimiento', { ascending: true })
          .limit(10)

        // ── Obligaciones ─────────────────────────────────────────────
        let obligacionesVencidas: any[] = []
        let obligacionesSemana: any[] = []
        let obligacionesMes: any[] = []
        let certificacionesVencer: any[] = []

        if (role === 'administrador' || role === 'consultor') {
          // Todas las obligaciones activas
          const { data: obsVencidas } = await supabaseAdmin
            .from('obligaciones')
            .select('nombre, fecha_vencimiento, categoria, empresas(razon_social)')
            .eq('activa', true)
            .lt('fecha_vencimiento', today)
            .order('fecha_vencimiento', { ascending: true })
            .limit(10)
          obligacionesVencidas = obsVencidas || []

          const { data: obsSemana } = await supabaseAdmin
            .from('obligaciones')
            .select('nombre, fecha_vencimiento, categoria, empresas(razon_social)')
            .eq('activa', true)
            .gte('fecha_vencimiento', today)
            .lte('fecha_vencimiento', next7Days)
            .order('fecha_vencimiento', { ascending: true })
            .limit(10)
          obligacionesSemana = obsSemana || []

          const { data: obsMes } = await supabaseAdmin
            .from('obligaciones')
            .select('nombre, fecha_vencimiento, categoria, empresas(razon_social)')
            .eq('activa', true)
            .gt('fecha_vencimiento', next7Days)
            .lte('fecha_vencimiento', next30Days)
            .order('fecha_vencimiento', { ascending: true })
            .limit(10)
          obligacionesMes = obsMes || []

          // Certificaciones de programas
          const { data: empresas } = await supabaseAdmin
            .from('empresas')
            .select('razon_social, immex_fecha_fin, prosec_fecha_fin, cert_iva_ieps_fecha_vencimiento, matriz_seguridad_fecha_vencimiento')

          for (const e of empresas || []) {
            const progs = [
              { label: 'IMMEX', date: e.immex_fecha_fin },
              { label: 'PROSEC', date: e.prosec_fecha_fin },
              { label: 'Cert. IVA/IEPS', date: e.cert_iva_ieps_fecha_vencimiento },
              { label: 'Matriz Seguridad', date: e.matriz_seguridad_fecha_vencimiento },
            ]
            for (const p of progs) {
              if (p.date && p.date >= today && p.date <= next30Days) {
                certificacionesVencer.push({ empresa: e.razon_social, tipo: p.label, fecha: p.date })
              }
            }
          }
        } else if (role === 'cliente') {
          const { data: clientProfile } = await supabaseAdmin
            .from('profiles').select('empresa_id').eq('id', profile.id).maybeSingle()

          if (clientProfile?.empresa_id) {
            const { data: obsVencidas } = await supabaseAdmin
              .from('obligaciones')
              .select('nombre, fecha_vencimiento, categoria, empresas(razon_social)')
              .eq('activa', true)
              .eq('empresa_id', clientProfile.empresa_id)
              .lt('fecha_vencimiento', today)
              .limit(5)
            obligacionesVencidas = obsVencidas || []

            const { data: obsSemana } = await supabaseAdmin
              .from('obligaciones')
              .select('nombre, fecha_vencimiento, categoria, empresas(razon_social)')
              .eq('activa', true)
              .eq('empresa_id', clientProfile.empresa_id)
              .gte('fecha_vencimiento', today)
              .lte('fecha_vencimiento', next7Days)
              .limit(5)
            obligacionesSemana = obsSemana || []
          }
        }

        // ── Filtrar cumplidas del periodo ────────────────────────────
        const allObIds = [...obligacionesVencidas, ...obligacionesSemana, ...obligacionesMes]
        if (allObIds.length > 0) {
          // Simple check: filter out already-completed ones would require more complex logic
          // For now send all pending/upcoming
        }

        const hasContent =
          (tareasVencidas?.length || 0) > 0 ||
          (tareasSemana?.length || 0) > 0 ||
          obligacionesVencidas.length > 0 ||
          obligacionesSemana.length > 0 ||
          obligacionesMes.length > 0 ||
          certificacionesVencer.length > 0

        if (!hasContent) {
          console.log(`Nothing to report for ${profile.nombre_completo}`)
          continue
        }

        const html = weeklySummaryTemplate(profile.nombre_completo, {
          tareasVencidas: (tareasVencidas || []).map(t => ({
            nombre: t.titulo,
            empresa: (t.empresas as any)?.razon_social || '',
            fecha: t.fecha_vencimiento,
          })),
          tareasSemana: (tareasSemana || []).map(t => ({
            nombre: t.titulo,
            empresa: (t.empresas as any)?.razon_social || '',
            fecha: t.fecha_vencimiento,
            prioridad: t.prioridad,
          })),
          obligacionesVencidas: obligacionesVencidas.map(o => ({
            nombre: o.nombre,
            empresa: (o.empresas as any)?.razon_social || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria,
          })),
          obligacionesSemana: obligacionesSemana.map(o => ({
            nombre: o.nombre,
            empresa: (o.empresas as any)?.razon_social || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria,
          })),
          obligacionesMes: obligacionesMes.map(o => ({
            nombre: o.nombre,
            empresa: (o.empresas as any)?.razon_social || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria,
          })),
          certificacionesVencer,
        })

        try {
          await sendEmail(user.email, '📋 Resumen Semanal de Cumplimiento — Comercio Exterior', html)
          emailsSent++
        } catch (e) {
          console.error(`Failed email for ${user.email}:`, e)
          emailsFailed++
        }

        // Notificación in-app
        const parts = []
        if (obligacionesVencidas.length) parts.push(`${obligacionesVencidas.length} obligacion(es) vencida(s)`)
        if (obligacionesSemana.length) parts.push(`${obligacionesSemana.length} vencen esta semana`)
        if ((tareasVencidas?.length || 0)) parts.push(`${tareasVencidas!.length} tarea(s) vencida(s)`)

        if (parts.length > 0) {
          await supabaseAdmin.from('notificaciones').insert({
            user_id: profile.id,
            tipo: 'resumen_semanal',
            titulo: 'Resumen Semanal de Cumplimiento',
            contenido: parts.join(' · '),
            referencia_tipo: 'sistema',
            leida: false,
          })
        }

      } catch (e) {
        console.error(`Error processing ${profile.id}:`, e)
        emailsFailed++
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent, emailsFailed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
