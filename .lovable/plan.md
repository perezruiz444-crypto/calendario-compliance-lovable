
Objetivo: restaurar la visibilidad de empresas y usuarios para admins sin abrir permisos de más.

Problema confirmado:
1. La falla principal no es “que no existan datos”, sino RLS roto en `profiles`.
   - En consola aparece: `infinite recursion detected in policy for relation "profiles"`.
   - `src/pages/Usuarios.tsx` hace `select` directo a `profiles`, por eso truena y muestra “Error al cargar usuarios”.
2. `Usuarios.tsx` además está ignorando el patrón seguro que ya existe:
   - ya hay una Edge Function `supabase/functions/list-users/index.ts`
   - pero la página sigue consultando `profiles` + `user_roles` desde el cliente.
3. `src/pages/Empresas.tsx` carga empresas demasiado pronto:
   - hoy hace fetch cuando existe `user`, no cuando la sesión/auth ya quedó realmente lista.
   - eso puede devolver listas vacías por carrera con `auth.uid()`, que encaja con “Sin empresas asignadas”.
4. El dashboard admin también cuenta usuarios con query directa a `profiles`, así que cuando esa consulta falla cae a ceros aunque los datos sigan existiendo.

Plan de implementación:
1. Blindar la inicialización de auth
   - extender `useAuth` con un estado tipo `authReady` / `initialized`
   - marcarlo listo solo después de `getSession()` y de resolver el rol
   - usar ese estado para impedir queries tempranas

2. Corregir los puntos que hoy disparan queries antes de tiempo
   - `src/pages/Empresas.tsx`
   - `src/pages/Usuarios.tsx`
   - `src/hooks/useAnalytics.tsx`
   - cualquier vista admin que dependa de empresas al montar
   - criterio: no consultar Supabase hasta que `authReady === true` y el rol esté resuelto

3. Arreglar la recursión de RLS en `profiles`
   - crear una migración
   - reescribir las policies de `profiles` para que no consulten `profiles` dentro de una policy de `profiles`
   - mover esa lógica a funciones `SECURITY DEFINER` seguras, por ejemplo para obtener `empresa_id` de un perfil o validar visibilidad
   - también corregir la policy de update propia que hoy hace subquery a `profiles`

4. Dejar de listar usuarios desde el navegador
   - cambiar `src/pages/Usuarios.tsx` para usar la Edge Function `list-users`
   - así los emails, roles y perfiles salen del lado servidor con validación de admin/consultor
   - esto evita depender de RLS compleja para una pantalla administrativa

5. Restaurar métricas admin sin falsos ceros
   - ajustar `useAnalytics` para que no compute “0 usuarios” cuando en realidad hubo error de permisos
   - después del fix de RLS, validar conteos de `profiles`, `user_roles` y empresas
   - si conviene, mover también los conteos sensibles a RPC/Edge Function

6. Hacer una pasada de endurecimiento
   - revisar componentes que aún consultan `user_roles` directo desde cliente
   - mantenerlos solo si la policy queda estable; si no, migrarlos a RPC/Edge Functions
   - prioridad inmediata: vistas admin y flujos de asignación

Detalles técnicos:
- No voy a abrir `profiles` ni `user_roles` públicamente.
- El fix debe mantener separación de roles en `user_roles`.
- La migración debe tocar policies/funciones, no editar `src/integrations/supabase/types.ts` manualmente.
- El patrón a seguir ya existe en el proyecto: `get_my_role` y `list-users` evitan depender de queries frágiles desde el cliente.

Resultado esperado:
- Admin vuelve a ver empresas en `/empresas`
- el selector de empresa vuelve a poblarse
- `/usuarios` vuelve a listar usuarios
- el dashboard admin deja de mostrar vacíos/ceros falsos
- consultores y clientes siguen viendo solo lo que les toca
