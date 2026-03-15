

# Plan: Desplegar y probar el correo SMTP

## Estado actual
- `_shared/smtp.ts` ya está migrado a `denomailer` (SMTP directo)
- Los secrets SMTP están configurados (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM)
- La función `send-test-email` no tiene logs, lo que indica que no ha sido desplegada con los cambios recientes

## Pasos

### 1. Desplegar `send-test-email`
Redesplegar la edge function para que tome el código actualizado de `_shared/smtp.ts`.

### 2. Probar desde la UI
Desde la página `/usuarios` donde estás ahora, hacer clic en "Enviar Correo" en cualquier usuario para disparar la prueba. Esto invocará la edge function con tu sesión autenticada.

### 3. Revisar logs
Después del envío, verificar los logs de la función para confirmar que el SMTP conectó correctamente y el correo fue entregado.

## Nota técnica
El problema clave es que `denomailer` usa conexiones TCP directas. Supabase Edge Functions (Deno Deploy) tiene soporte limitado para TCP. Si la conexión SMTP falla, el plan B sería cambiar a una API HTTP (como el SMTP relay de Supabase via `supabase.auth.admin` para magic links, o un proveedor con API REST).

