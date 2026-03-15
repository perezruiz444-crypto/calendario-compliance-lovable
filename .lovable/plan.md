

# Plan: Corregir sistema de correos SMTP en Edge Functions

## Diagnostico

El sistema actual usa `denomailer` en `_shared/smtp.ts`. El error `BadResource: Bad resource ID` ocurre porque STARTTLS (puerto 587) no funciona en Deno Deploy. Sin embargo, segun la documentacion de Supabase y reportes de la comunidad, **puerto 465 con TLS implicito SI funciona** tanto con `denomailer` como con `nodemailer`.

Los secrets necesarios ya existen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

No se necesitan secrets adicionales (no se usa Resend, no se usa Send Email Hook).

## Cambios

### 1. Reescribir `supabase/functions/_shared/smtp.ts`
Cambiar de `denomailer` a `npm:nodemailer@6.9.10` que tiene soporte probado en Supabase Edge Functions con puerto 465.

```typescript
import nodemailer from "npm:nodemailer@6.9.10";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const host = Deno.env.get('SMTP_HOST');
  const port = Number(Deno.env.get('SMTP_PORT') || '465');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASSWORD');
  const from = Deno.env.get('SMTP_FROM') || user || '';

  if (!host || !user || !pass) {
    throw new Error('SMTP config incomplete');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({ from, to, subject, html });
}
```

La firma `sendEmail(to, subject, html)` no cambia, las 5 Edge Functions no necesitan cambios internos.

### 2. Corregir bug de auth en `send-test-email/index.ts`
Linea 24: agregar validacion de `authHeader` antes del `.replace()` para evitar `TypeError` cuando el header es null.

### 3. Verificar que `SMTP_PORT` sea 465
Si el secret `SMTP_PORT` esta configurado como 587, hay que actualizarlo a 465 para que use SSL implicito (compatible con Edge Functions). Preguntaremos al usuario si necesita cambiar este valor.

### 4. Redesplegar las 5 Edge Functions
- `send-test-email`
- `send-user-invitation`
- `send-task-notifications`
- `send-daily-summary`
- `send-report-email`

### 5. Probar con `send-test-email`
Usar curl o la UI para disparar un correo de prueba y verificar en logs que la conexion SMTP funciona.

## Notas
- No se usa Resend en ningun momento
- No se toca ninguna plantilla HTML
- No se modifica logica de negocio de ninguna funcion
- Solo cambia la capa de transporte SMTP

