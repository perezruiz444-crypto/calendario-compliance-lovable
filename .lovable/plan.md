

## Conectar Resend y crear plantillas de correo

### Situación actual

- Resend ya está conectado via API key (`RESEND_API_KEY`) y funcionando a través de `_shared/smtp.ts`.
- No existe un conector nativo de Resend en Lovable (no está en la lista de conectores disponibles), así que la integración actual via API key directa es la correcta.
- Hay 4 edge functions con plantillas HTML inline (estilos repetidos, sin branding consistente):
  - `send-test-email` — correo de prueba
  - `send-task-notifications` — recordatorios/asignaciones de tareas
  - `send-daily-summary` — resumen diario
  - `send-report-email` — reportes a clientes

### Plan

**1. Crear sistema de plantillas HTML compartido**

Crear `supabase/functions/_shared/email-templates.ts` con:
- Función `baseLayout(content: string)` — wrapper HTML con header (logo/nombre de la plataforma), estilos consistentes, colores de marca, y footer con disclaimer
- Funciones específicas por tipo:
  - `testEmailTemplate(userName, subject, message)` 
  - `taskNotificationTemplate(consultorName, titulo, tareas[])` 
  - `dailySummaryTemplate(userName, stats, tareas[])` 
  - `reportEmailTemplate(empresa, periodo, resumen)` 
  - `userInvitationTemplate(userName, tempPassword)`

**2. Actualizar cada edge function**

Reemplazar el HTML inline en cada función por llamadas a las plantillas compartidas. La lógica de negocio no cambia, solo se reemplaza la generación de HTML.

**3. Redeploy de todas las funciones afectadas**

Desplegar las 5 funciones que usan email: `send-test-email`, `send-task-notifications`, `send-daily-summary`, `send-report-email`, `send-user-invitation`.

### Nota sobre dominio

Actualmente el `SMTP_FROM` determina el remitente. Si no tienes un dominio verificado en Resend, los correos solo se envían desde `onboarding@resend.dev` y solo llegan a tu email registrado en Resend. Para enviar a cualquier destinatario necesitas verificar tu dominio en el dashboard de Resend.

