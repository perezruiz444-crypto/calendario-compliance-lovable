

## Plan: Migrar envío de emails a Resend HTTP API

### Problema
SMTP directo no funciona en Supabase Edge Functions (Deno Deploy bloquea puertos SMTP). Ya tienes `RESEND_API_KEY` configurado.

### Cambios

**1. Actualizar secret `RESEND_API_KEY`** con el nuevo valor proporcionado.

**2. Modificar `supabase/functions/_shared/smtp.ts`**
- Reemplazar `denomailer` por `fetch()` a `https://api.resend.com/emails`
- Usar `RESEND_API_KEY` para autenticación
- Mantener `SMTP_FROM` como dirección de envío (o `onboarding@resend.dev` si el dominio no está verificado en Resend)
- Misma interfaz `sendEmail(to, subject, html)` — ninguna otra función necesita cambios

**3. Redeploy** de las 5 edge functions que usan `sendEmail`:
- `send-test-email`, `send-daily-summary`, `send-report-email`, `send-task-notifications`, `send-user-invitation`

### Nota importante
Si tu dominio de envío no está verificado en Resend, los emails solo llegarán a tu propia cuenta y deberás usar `onboarding@resend.dev` como remitente de prueba.

