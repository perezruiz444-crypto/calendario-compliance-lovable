

## Plan: Corregir envío de emails usando SMTP configurado

### Problema
Las funciones `send-test-email`, `send-daily-summary`, `send-report-email` y `send-task-notifications` usan `generateLink({ type: 'magiclink' })` que solo genera un enlace pero no envía el email con el contenido deseado. Ya tienes secretos SMTP configurados (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) que no se están usando.

### Solución
Usar la librería `denomailer` (SMTP nativo para Deno) con los secretos SMTP ya configurados para enviar emails reales con el contenido HTML preparado.

### Cambios

**1. Crear helper SMTP compartido**
`supabase/functions/_shared/smtp.ts`
- Función `sendEmail(to, subject, htmlBody)` usando `denomailer` con los secretos SMTP existentes
- Conexión TLS al servidor SMTP configurado

**2. Actualizar `send-test-email/index.ts`**
- Reemplazar `generateLink` por `sendEmail()` con el asunto y mensaje del usuario
- Template HTML sencillo con el contenido real

**3. Actualizar `send-daily-summary/index.ts`**
- Reemplazar `generateLink` por `sendEmail()` con el resumen HTML ya preparado en la función

**4. Actualizar `send-report-email/index.ts`**
- Reemplazar `generateLink` por `sendEmail()` — el template HTML del reporte ya existe en la función, solo falta enviarlo realmente

**5. Actualizar `send-task-notifications/index.ts`**
- Agregar envío de email real al consultor con listado de tareas pendientes
- Mantener las notificaciones in-app existentes

**6. Actualizar CORS headers** en todas las funciones para incluir headers de Supabase client.

### Helper SMTP (resumen técnico)

```typescript
// denomailer - librería SMTP nativa para Deno
import { SmtpClient } from "https://deno.land/x/denomailer/mod.ts";

export async function sendEmail(to: string, subject: string, html: string) {
  const client = new SmtpClient();
  await client.connectTLS({
    hostname: Deno.env.get('SMTP_HOST')!,
    port: Number(Deno.env.get('SMTP_PORT')),
    username: Deno.env.get('SMTP_USER')!,
    password: Deno.env.get('SMTP_PASSWORD')!,
  });
  await client.send({ from: Deno.env.get('SMTP_FROM')!, to, subject, content: html, html: true });
  await client.close();
}
```

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nuevo: `supabase/functions/_shared/smtp.ts` | Helper SMTP con denomailer |
| `supabase/functions/send-test-email/index.ts` | Usar sendEmail() real |
| `supabase/functions/send-daily-summary/index.ts` | Usar sendEmail() real |
| `supabase/functions/send-report-email/index.ts` | Usar sendEmail() real |
| `supabase/functions/send-task-notifications/index.ts` | Agregar envío email real |

