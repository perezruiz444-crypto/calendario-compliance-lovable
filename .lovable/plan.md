

## Diagnóstico: Asignación de clientes via invitación no funciona

### Problema encontrado

Hay un **bug crítico** en el flujo de invitación (`send-user-invitation`). El rol nunca se asigna porque depende de una cadena de triggers que no se completa:

```text
Flujo esperado:
  1. Se crea usuario con email_confirm: false
  2. Usuario usa recovery link → establece contraseña
  3. Trigger update_invitation_on_user_confirm detecta email_confirmed_at → actualiza invitation a "accepted"
  4. Trigger assign_role_on_invitation_accepted → inserta en user_roles

Problema:
  - El recovery link NO confirma el email (email_confirmed_at queda NULL)
  - El paso 3 nunca se ejecuta → rol nunca se asigna
  - useAuth detecta que no hay rol → cierra sesión automáticamente
  - El usuario queda bloqueado sin poder entrar
```

En contraste, el flujo de **creación directa con contraseña** (`create-user`) funciona correctamente porque inserta el rol directamente en `user_roles`.

### Solución

**Modificar `supabase/functions/send-user-invitation/index.ts`**: Después de crear el usuario, insertar directamente el rol en `user_roles` (igual que hace `create-user`), en lugar de depender de la cadena de triggers.

Cambio concreto — agregar después de la línea `console.log('User created successfully:')`:

```typescript
// Assign role directly (triggers depend on email confirmation which doesn't happen with recovery links)
const { error: roleError } = await supabaseAdmin
  .from('user_roles')
  .insert({ user_id: userData.user.id, role });

if (roleError) {
  console.error('Error assigning role:', roleError);
}
```

Esto hace que el usuario tenga su rol desde el momento de creación, igual que en el flujo directo. La cadena de triggers queda como respaldo redundante.

**No se requieren cambios** en la UI (`CreateUserDialog`, `EditUserDialog`, `MiEmpresa`) ni en la lógica de autenticación — todo lo demás está correcto.

### Verificación post-fix

Una vez aplicado, Marlene Villalpando (u otros clientes creados por invitación) podrán iniciar sesión correctamente y ver su empresa asignada en `/mi-empresa`.

