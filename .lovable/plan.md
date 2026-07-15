## Problema
La base de datos está activa. Lo que falla es la edge function `create-user`: intenta insertar en `user_roles` un rol que el trigger `handle_new_user` ya insertó, y revienta con duplicate key. Además, no pasa el `role` en el metadata, así que el trigger siempre asigna `cliente` por defecto (bug adicional).

## Cambios

### 1. `supabase/functions/create-user/index.ts`
- Pasar `role` dentro de `user_metadata` al llamar `auth.admin.createUser`, para que el trigger `handle_new_user` asigne el rol correcto desde el inicio.
- Cambiar el `INSERT` posterior en `user_roles` por un `UPSERT` con `onConflict: 'user_id,role'` e `ignoreDuplicates: true` (queda como respaldo idempotente por si el trigger no corriera).
- Como fallback: si la inserción del rol falla por cualquier motivo distinto a duplicado, **no** dejar el usuario huérfano — hacer `auth.admin.deleteUser(newUser.user.id)` y devolver error.

### 2. `supabase/functions/send-user-invitation/index.ts` (verificar)
Revisar si tiene el mismo patrón (insertar rol después de crear el usuario) y aplicar la misma corrección de idempotencia + pasar `role` en metadata.

## Lo que NO cambia
- Trigger `handle_new_user`, tabla `user_roles`, RLS, ni schema.
- Flujo de invitación por email ni UI de `CreateUserDialog.tsx`.

## Verificación
- Crear un consultor con contraseña → debe quedar con rol `consultor` (no `cliente`).
- Crear un cliente con contraseña asociado a una empresa → sin error de duplicado, rol `cliente` correcto.
- Revisar logs de la edge function tras la prueba: sin errores `23505`.
