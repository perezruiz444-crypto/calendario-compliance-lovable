

# Fix: Asignación de tareas con recursión RLS en `user_roles`

## Problema

`MultipleAssignees.tsx` hace queries directas a `user_roles` y `profiles` desde el cliente para poblar la lista de personas asignables. Las RLS policies de `user_roles` usan `has_role()`, que a su vez consulta `user_roles` -- causando la misma recursión infinita que ya rompió la página de usuarios.

Policies problemáticas en `user_roles`:
- "Admins can manage roles": `USING has_role(auth.uid(), 'administrador')` → consulta `user_roles` → RLS → `has_role()` → loop
- "Consultores can view roles": también usa `has_role()` + join a `profiles`

Resultado: la lista de usuarios asignables probablemente aparece vacía o da error silencioso.

## Plan

### 1. Corregir RLS de `user_roles` (migración)
Reescribir las policies de `user_roles` para que no se auto-referencien vía `has_role()`. Usar una función `SECURITY DEFINER` que haga la verificación sin pasar por RLS.

```sql
-- Función que verifica rol sin disparar RLS en user_roles
CREATE OR REPLACE FUNCTION public.check_user_role(p_user_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role) $$;

-- Reconstruir policies de user_roles usando check_user_role en vez de has_role
```

### 2. Actualizar `has_role()` para ser SECURITY DEFINER
Alternativamente, si `has_role` ya es `SECURITY DEFINER` (lo cual debería evitar recursión), verificar que realmente lo sea. Si no, corregirlo. Esto arreglaría `user_roles` y todas las demás tablas que lo usan.

### 3. Simplificar `MultipleAssignees.fetchUsuarios()`
Actualmente hace N+1 queries (un query por cada perfil de cliente para verificar su rol). Cambiar a un patrón más eficiente: un solo RPC o un join que devuelva usuarios con su rol, evitando queries individuales a `user_roles`.

## Resultado esperado
- Al abrir el detalle de una tarea y hacer clic en "Agregar" asignado, aparecen los consultores y clientes disponibles
- No hay errores silenciosos de recursión
- El toggle de asignar/desasignar funciona correctamente

