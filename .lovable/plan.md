

# Plan: Migrar de Resend a SMTP directo usando los secrets existentes

## Situacion actual
- `_shared/smtp.ts` usa la API HTTP de Resend (`fetch` a `api.resend.com`)
- Los secrets SMTP ya existen: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- 5 Edge Functions dependen de `sendEmail()`: `send-test-email`, `send-user-invitation`, `send-task-notifications`, `send-daily-summary`, `send-report-email`

## Cambios

### 1. Reescribir `_shared/smtp.ts`
Reemplazar la llamada a Resend API por SMTP directo usando la libreria `denomailer` (`https://deno.land/x/denomailer/mod.ts`), que funciona en Deno Deploy. La firma de `sendEmail(to, subject, html)` se mantiene identica para no romper las 5 funciones que la consumen.

### 2. Eliminar dependencia de Resend
- Quitar cualquier referencia a `RESEND_API_KEY` del codigo
- El secret puede permanecer en Supabase (no afecta), pero ya no se usara

### 3. Redesplegar las 5 Edge Functions
Tras el cambio en `_shared/smtp.ts`, redesplegar todas las funciones que la importan para que usen el nuevo codigo.

## Detalle tecnico

```text
_shared/smtp.ts (ANTES)
  fetch('https://api.resend.com/emails') + RESEND_API_KEY

_shared/smtp.ts (DESPUES)  
  denomailer SMTPClient → connect(SMTP_HOST:SMTP_PORT) 
  → auth(SMTP_USER, SMTP_PASSWORD) → send(SMTP_FROM, to, subject, html)
```

No se tocan las plantillas HTML (`_shared/email-templates.ts`) ni la logica de ninguna Edge Function. Solo cambia el transporte.

