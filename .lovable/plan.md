

# Plan: Corregir Configuración de Edge Functions

## Problema Identificado

El archivo `supabase/config.toml` solo configura 3 de las 9 Edge Functions existentes. Las 6 funciones faltantes usan el valor por defecto `verify_jwt = true`, lo cual causa que Supabase bloquee las requests con error 401 antes de que el código pueda procesarlas.

### Estado Actual del config.toml:
```
project_id = "svozqrjhwaohfmbkhpig"

[functions.send-report-email]
verify_jwt = true

[functions.send-task-notifications]
verify_jwt = true

[functions.send-user-invitation]
verify_jwt = true
```

### Funciones Faltantes:
- `create-user`
- `delete-user`
- `list-users`
- `update-user`
- `send-daily-summary`
- `send-test-email`

---

## Solución

Actualizar `supabase/config.toml` para incluir **todas** las Edge Functions con `verify_jwt = false`. Esto permite que cada función maneje su propia autenticación internamente (como ya lo hacen).

### Análisis de Autenticación por Función:

| Función | Auth Interna | Tipo de Verificación |
|---------|--------------|----------------------|
| create-user | Sí | Admin/Consultor via getUser + roles |
| delete-user | Sí | Admin via getUser + roles |
| list-users | Sí | Admin via getUser + roles |
| update-user | Sí | Admin via getUser + roles |
| send-test-email | Sí | Admin/Consultor via getUser + roles |
| send-report-email | Sí | Usuario via getUser |
| send-task-notifications | Sí | Usuario via getUser |
| send-user-invitation | Sí | Usuario via getUser |
| send-daily-summary | No | Job interno (service role) |

---

## Cambios a Realizar

### 1. Actualizar supabase/config.toml

Nuevo contenido completo:

```toml
project_id = "svozqrjhwaohfmbkhpig"

[functions.create-user]
verify_jwt = false

[functions.delete-user]
verify_jwt = false

[functions.list-users]
verify_jwt = false

[functions.update-user]
verify_jwt = false

[functions.send-daily-summary]
verify_jwt = false

[functions.send-report-email]
verify_jwt = false

[functions.send-task-notifications]
verify_jwt = false

[functions.send-test-email]
verify_jwt = false

[functions.send-user-invitation]
verify_jwt = false
```

---

## Verificación Post-Implementación

Después de aplicar los cambios, se debe verificar:

1. **create-user**: Crear un nuevo usuario desde panel de administración
2. **delete-user**: Eliminar un usuario de prueba
3. **list-users**: Verificar que se cargue la lista de usuarios
4. **update-user**: Editar información de un usuario
5. **send-test-email**: Enviar email de prueba desde el panel
6. **send-user-invitation**: Invitar un nuevo usuario
7. **send-report-email**: Generar y enviar un reporte
8. **send-task-notifications**: Enviar notificación de tarea
9. **send-daily-summary**: Verificar que funcione cuando se invoque manualmente

---

## Notas Técnicas

- Todas las funciones ya implementan validación de autenticación interna usando `supabaseAdmin.auth.getUser(token)` o `supabaseClient.auth.getUser()`
- Las funciones que requieren roles específicos (admin/consultor) verifican contra la tabla `user_roles`
- `send-daily-summary` es un job programado que no requiere autenticación de usuario ya que usa el `SUPABASE_SERVICE_ROLE_KEY` directamente
- No se requieren cambios en el código de las Edge Functions, solo en la configuración

