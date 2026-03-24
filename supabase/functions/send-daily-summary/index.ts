import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { weeklySummaryTemplate } from '../_shared/email-templates.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Proteger endpoint — solo cron autorizado o service role
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const reqCronSecret = req.headers.get('x-cron-secret') ?? '';

  const isServiceRole = authHeader.includes('service_role');
  const isCron = cronSecret.length > 0 && reqCronSecret === cronSecret;

  if (!isServiceRole && !isCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Load configurable dias_antes per program type from reminder_rules
    const { data: reminderRules } = await supabaseAdmin
      .from('reminder_rules')
      .select('tipo, dias_antes')
      .eq('activa', true)

    const diasAntesByTipo: Record<string, number> = {}
    for (const rule of reminderRules || []) {
      if (!diasAntesByTipo[rule.tipo] || rule.dias_antes > diasAntesByTipo[rule.tipo]) {
        diasAntesByTipo[rule.tipo] = rule.dias_antes
      }
    }
    const getDias = (tipo: string) => diasAntesByTipo[tipo] ?? 30

    // Helper: get renewal cutoff date string for a program type
    const getRenewalCutoff = (tipo: string): string => {
      const dias = getDias(tipo)
      return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

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
        let renovacionesProximas: { empresa: string; programa: string; fecha: string; diasRestantes: number }[] = []

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

          // Renovaciones de programas (usa fecha_renovar + configurable dias_antes)
          const { data: empresas } = await supabaseAdmin
            .from('empresas')
            .select(`
              razon_social,
              immex_fecha_fin,
              immex_fecha_autorizacion,
              immex_periodo_renovacion_meses,
              prosec_fecha_fin,
              prosec_fecha_siguiente_renovacion,
              cert_iva_ieps_fecha_vencimiento,
              cert_iva_ieps_fecha_renovar,
              matriz_seguridad_fecha_vencimiento,
              matriz_seguridad_fecha_renovar
            `)

          for (const e of (empresas || [])) {
            // CERTIVA: prefer fecha_renovar, fallback to fecha_vencimiento
            const certFecha = e.cert_iva_ieps_fecha_renovar || e.cert_iva_ieps_fecha_vencimiento
            const certCutoff = getRenewalCutoff('certificacion')
            if (certFecha && certFecha >= today && certFecha <= certCutoff) {
              const dias = Math.ceil((new Date(certFecha + 'T12:00:00').getTime() - Date.now()) / 86400000)
              renovacionesProximas.push({ empresa: e.razon_social, programa: 'Cert. IVA/IEPS', fecha: certFecha, diasRestantes: dias })
            }

            // PROSEC: prefer fecha_siguiente_renovacion, fallback to fecha_fin
            const prosecFecha = e.prosec_fecha_siguiente_renovacion || e.prosec_fecha_fin
            const prosecCutoff = getRenewalCutoff('prosec')
            if (prosecFecha && prosecFecha >= today && prosecFecha <= prosecCutoff) {
              const dias = Math.ceil((new Date(prosecFecha + 'T12:00:00').getTime() - Date.now()) / 86400000)
              renovacionesProximas.push({ empresa: e.razon_social, programa: 'PROSEC', fecha: prosecFecha, diasRestantes: dias })
            }

            // Matriz de Seguridad: prefer fecha_renovar, fallback to fecha_vencimiento
            const matrizFecha = e.matriz_seguridad_fecha_renovar || e.matriz_seguridad_fecha_vencimiento
            const matrizCutoff = getRenewalCutoff('matriz_seguridad')
            if (matrizFecha && matrizFecha >= today && matrizFecha <= matrizCutoff) {
              const dias = Math.ceil((new Date(matrizFecha + 'T12:00:00').getTime() - Date.now()) / 86400000)
              renovacionesProximas.push({ empresa: e.razon_social, programa: 'Matriz de Seguridad', fecha: matrizFecha, diasRestantes: dias })
            }

            // IMMEX: calculate from autorización + period, or use immex_fecha_fin
            const immexCutoff = getRenewalCutoff('immex')
            if (e.immex_fecha_autorizacion && e.immex_periodo_renovacion_meses) {
              const autDate = new Date(e.immex_fecha_autorizacion + 'T12:00:00')
              const meses = e.immex_periodo_renovacion_meses as number
              let nextRenewal = new Date(autDate)
              const nowDate = new Date()
              while (nextRenewal <= nowDate) {
                nextRenewal = new Date(nextRenewal.setMonth(nextRenewal.getMonth() + meses))
              }
              const nextStr = nextRenewal.toISOString().split('T')[0]
              if (nextStr >= today && nextStr <= immexCutoff) {
                const dias = Math.ceil((nextRenewal.getTime() - Date.now()) / 86400000)
                renovacionesProximas.push({ empresa: e.razon_social, programa: 'IMMEX', fecha: nextStr, diasRestantes: dias })
              }
            } else if (e.immex_fecha_fin && e.immex_fecha_fin >= today && e.immex_fecha_fin <= immexCutoff) {
              const dias = Math.ceil((new Date(e.immex_fecha_fin + 'T12:00:00').getTime() - Date.now()) / 86400000)
              renovacionesProximas.push({ empresa: e.razon_social, programa: 'IMMEX', fecha: e.immex_fecha_fin, diasRestantes: dias })
            }

            // Keep legacy certificacionesVencer for backwards compatibility (use vencimiento dates within 30 days)
            const legacyProgs = [
              { label: 'IMMEX', date: e.immex_fecha_fin },
              { label: 'PROSEC', date: e.prosec_fecha_fin },
              { label: 'Cert. IVA/IEPS', date: e.cert_iva_ieps_fecha_vencimiento },
              { label: 'Matriz Seguridad', date: e.matriz_seguridad_fecha_vencimiento },
            ]
            for (const p of legacyProgs) {
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
          certificacionesVencer.length > 0 ||
          renovacionesProximas.length > 0

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
          renovacionesProximas,
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
