import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/smtp.ts'
import { weeklySummaryTemplate } from '../_shared/email-templates.ts'

type EmpresaEmbed = { razon_social: string } | { razon_social: string }[] | null

interface ObligacionResumen {
  nombre: string
  fecha_vencimiento: string
  categoria: string | null
  empresas: EmpresaEmbed
}

type ObligacionEmbed = { nombre: string; categoria: string | null } | { nombre: string; categoria: string | null }[] | null

interface OcurrenciaRow {
  obligacion_id: string
  periodo_key: string
  fecha_vencimiento: string
  obligaciones: ObligacionEmbed
  empresas: EmpresaEmbed
}

/** PostgREST puede devolver el embed como objeto o como arreglo según la relación. */
function razonSocial(empresas: EmpresaEmbed | undefined): string {
  const empresa = Array.isArray(empresas) ? empresas[0] : empresas
  return empresa?.razon_social ?? ''
}

const PAGE = 1000

/**
 * Obligaciones pendientes según sus periodos (ocurrencias) y los cumplimientos vigentes.
 * Un periodo marcado como cumplido nunca aparece. Por obligación:
 * - vencida: el periodo vencido más reciente sin marcar, con "+N periodos atrasados" si hay más;
 * - semana / mes: el próximo periodo sin marcar dentro de la ventana.
 * empresaIds = null → todas las empresas (admin).
 */
async function obligacionesPendientes(
  supabaseAdmin: SupabaseClient,
  empresaIds: string[] | null,
  today: string,
  next7Days: string,
  next30Days: string,
) {
  const ocurrencias: OcurrenciaRow[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabaseAdmin
      .from('obligacion_ocurrencias')
      .select('obligacion_id, periodo_key, fecha_vencimiento, obligaciones!inner(nombre, categoria, activa), empresas(razon_social)')
      .eq('obligaciones.activa', true)
      .lte('fecha_vencimiento', next30Days)
      .order('fecha_vencimiento', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (empresaIds) q = q.in('empresa_id', empresaIds)
    const { data, error } = await q
    if (error) throw error
    ocurrencias.push(...((data || []) as unknown as OcurrenciaRow[]))
    if (!data || data.length < PAGE) break
  }

  const obIds = [...new Set(ocurrencias.map(o => o.obligacion_id))]
  const cumplidas = new Set<string>()
  for (let i = 0; i < obIds.length; i += 200) {
    const { data, error } = await supabaseAdmin
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key')
      .eq('vigente', true)
      .eq('completada', true)
      .in('obligacion_id', obIds.slice(i, i + 200))
    if (error) throw error
    for (const c of data || []) cumplidas.add(`${c.obligacion_id}:${c.periodo_key}`)
  }

  // Agrupar periodos sin marcar por obligación (ya vienen ordenados por fecha)
  const porObligacion = new Map<string, OcurrenciaRow[]>()
  for (const oc of ocurrencias) {
    if (cumplidas.has(`${oc.obligacion_id}:${oc.periodo_key}`)) continue
    const lista = porObligacion.get(oc.obligacion_id) ?? []
    lista.push(oc)
    porObligacion.set(oc.obligacion_id, lista)
  }

  const resumen = (oc: OcurrenciaRow, atrasadas = 0): ObligacionResumen => {
    const ob = Array.isArray(oc.obligaciones) ? oc.obligaciones[0] : oc.obligaciones
    const nombre = ob?.nombre ?? 'Obligación'
    return {
      nombre: atrasadas > 0 ? `${nombre} (+${atrasadas} periodo${atrasadas > 1 ? 's' : ''} atrasado${atrasadas > 1 ? 's' : ''})` : nombre,
      fecha_vencimiento: oc.fecha_vencimiento,
      categoria: ob?.categoria ?? null,
      empresas: oc.empresas,
    }
  }

  const vencidas: ObligacionResumen[] = []
  const semana: ObligacionResumen[] = []
  const mes: ObligacionResumen[] = []
  for (const lista of porObligacion.values()) {
    const pasadas = lista.filter(oc => oc.fecha_vencimiento < today)
    if (pasadas.length > 0) {
      vencidas.push(resumen(pasadas[pasadas.length - 1], pasadas.length - 1))
      continue
    }
    const proxima = lista[0]
    if (proxima.fecha_vencimiento <= next7Days) semana.push(resumen(proxima))
    else mes.push(resumen(proxima))
  }

  const porFecha = (a: ObligacionResumen, b: ObligacionResumen) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
  return { vencidas: vencidas.sort(porFecha), semana: semana.sort(porFecha), mes: mes.sort(porFecha) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Proteger endpoint — solo cron con CRON_SECRET
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const reqCronSecret = req.headers.get('x-cron-secret') ?? '';

  if (!cronSecret || reqCronSecret !== cronSecret) {
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
      // Respeta "Frecuencia de resumen: Nunca" de Preferencias; null cuenta como el default (diario).
      .or('resumen_frecuencia.is.null,resumen_frecuencia.neq.nunca')

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
        let obligacionesVencidas: ObligacionResumen[] = []
        let obligacionesSemana: ObligacionResumen[] = []
        let obligacionesMes: ObligacionResumen[] = []
        const certificacionesVencer: { empresa: string; tipo: string; fecha: string }[] = []
        const renovacionesProximas: { empresa: string; programa: string; fecha: string; diasRestantes: number }[] = []

        if (role === 'administrador' || role === 'consultor') {
          // Para consultores: solo empresas asignadas. Para admins: todas.
          let empresaIdFilter: string[] | null = null
          if (role === 'consultor') {
            const { data: asignaciones } = await supabaseAdmin
              .from('consultor_empresa_asignacion')
              .select('empresa_id')
              .eq('consultor_id', profile.id)
            empresaIdFilter = (asignaciones || []).map((a: { empresa_id: string }) => a.empresa_id)
            if (empresaIdFilter.length === 0) {
              // Consultor sin empresas asignadas — no hay nada que reportar
              continue
            }
          }

          const pend = await obligacionesPendientes(supabaseAdmin, empresaIdFilter, today, next7Days, next30Days)
          obligacionesVencidas = pend.vencidas.slice(0, 10)
          obligacionesSemana = pend.semana.slice(0, 10)
          obligacionesMes = pend.mes.slice(0, 10)

          // Renovaciones de programas (usa fecha_renovar + configurable dias_antes)
          let empresasQuery = supabaseAdmin
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
          if (empresaIdFilter) {
            empresasQuery = empresasQuery.in('id', empresaIdFilter)
          }
          const { data: empresas } = await empresasQuery

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
            const pend = await obligacionesPendientes(supabaseAdmin, [clientProfile.empresa_id], today, next7Days, next30Days)
            obligacionesVencidas = pend.vencidas.slice(0, 5)
            obligacionesSemana = pend.semana.slice(0, 5)
          }
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
            empresa: razonSocial(t.empresas) || '',
            fecha: t.fecha_vencimiento,
          })),
          tareasSemana: (tareasSemana || []).map(t => ({
            nombre: t.titulo,
            empresa: razonSocial(t.empresas) || '',
            fecha: t.fecha_vencimiento,
            prioridad: t.prioridad,
          })),
          obligacionesVencidas: obligacionesVencidas.map(o => ({
            nombre: o.nombre,
            empresa: razonSocial(o.empresas) || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria ?? undefined,
          })),
          obligacionesSemana: obligacionesSemana.map(o => ({
            nombre: o.nombre,
            empresa: razonSocial(o.empresas) || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria ?? undefined,
          })),
          obligacionesMes: obligacionesMes.map(o => ({
            nombre: o.nombre,
            empresa: razonSocial(o.empresas) || '',
            fecha: o.fecha_vencimiento,
            categoria: o.categoria ?? undefined,
          })),
          certificacionesVencer,
          renovacionesProximas,
        })

        try {
          const totalVencidas = (tareasVencidas?.length || 0) + obligacionesVencidas.length
          const totalSemana = (tareasSemana?.length || 0) + obligacionesSemana.length
          const asunto = totalVencidas > 0
            ? `${totalVencidas} obligación(es) requieren atención esta semana — Calendario Compliance`
            : totalSemana > 0
              ? `Esta semana vencen ${totalSemana} obligación(es) — revisa tu calendario`
              : `Semana en verde — sin obligaciones urgentes`
          await sendEmail(user.email, asunto, html)
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

  } catch (error) {
    console.error('Error in send-daily-summary:', error)
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
