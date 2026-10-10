-- Aplicada en producción el 2026-10-10 vía MCP (nombre: nombres_perfiles).
-- Expone SOLO id + nombre_completo (nunca email/telefono) para resolver nombres en mensajes, tareas, comentarios, etc.
-- Visible si: lo pide un admin o es el propio usuario; el usuario es staff (admin/consultor);
-- o es cliente y la política actual de profiles ya permitiría verlo.
create or replace function public.nombres_perfiles(ids uuid[])
returns table (id uuid, nombre_completo text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nombre_completo
  from profiles p
  where p.id = any(ids)
    and auth.uid() is not null
    and (
      has_role(auth.uid(), 'administrador')
      or p.id = auth.uid()
      or exists (select 1 from user_roles ur
                 where ur.user_id = p.id and ur.role in ('administrador', 'consultor'))
      or (has_role(auth.uid(), 'consultor') and exists (
            select 1 from consultor_empresa_asignacion cea
            where cea.consultor_id = auth.uid() and cea.empresa_id = p.empresa_id))
      or (p.empresa_id is not null and p.empresa_id = get_my_empresa_id())
    );
$$;

revoke all on function public.nombres_perfiles(uuid[]) from public, anon;
grant execute on function public.nombres_perfiles(uuid[]) to authenticated;
