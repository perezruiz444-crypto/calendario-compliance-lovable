import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user is admin or consultor
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!roleData || !['administrador', 'consultor'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Scope profile visibility for consultores to their assigned empresas
    let allowedEmpresaIds: string[] | null = null;
    if (roleData.role === 'consultor') {
      const { data: asignaciones } = await supabaseAdmin
        .from('consultor_empresa_asignacion')
        .select('empresa_id')
        .eq('consultor_id', user.id);
      allowedEmpresaIds = (asignaciones || []).map((a: any) => a.empresa_id);
    }

    // Fetch profiles (scoped for consultores)
    let profilesQuery = supabaseAdmin
      .from('profiles')
      .select('id, nombre_completo, created_at, empresa_id')
      .order('created_at', { ascending: false })

    if (allowedEmpresaIds !== null) {
      if (allowedEmpresaIds.length === 0) {
        return new Response(JSON.stringify({ users: [] }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      profilesQuery = profilesQuery.in('empresa_id', allowedEmpresaIds)
    }

    const { data: profiles, error: profilesError } = await profilesQuery

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return new Response(JSON.stringify({ error: 'Failed to retrieve user list.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch only the roles for visible users
    const visibleIds = profiles.map((p: any) => p.id)
    const { data: userRoles } = visibleIds.length
      ? await supabaseAdmin.from('user_roles').select('user_id, role').in('user_id', visibleIds)
      : { data: [] as any[] }

    // Create a map of user roles for quick lookup
    const rolesMap = new Map()
    userRoles?.forEach(ur => {
      rolesMap.set(ur.user_id, ur.role)
    })

    // Get all auth users in one call instead of N individual getUserById calls
    const { data: { users: authUsers }, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      return new Response(JSON.stringify({ error: 'Failed to retrieve user list.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const emailMap = new Map(authUsers.map(u => [u.id, u.email]))

    const usersWithEmails = profiles.map((profile) => ({
      id: profile.id,
      email: emailMap.get(profile.id) || 'N/A',
      nombre_completo: profile.nombre_completo,
      role: rolesMap.get(profile.id) || 'sin rol',
      created_at: profile.created_at,
    }))

    return new Response(JSON.stringify({ users: usersWithEmails }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in list-users function:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
