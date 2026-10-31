# Correos automáticos de obligaciones: lunes a viernes

Cambio solicitado el 31/10/2026: desactivar el envío automático de notificaciones de obligaciones los sábados y domingos.

## Aplicado y verificado en producción

El job existente `send-daily-summary-email` (id 2) cambió de `0 14 * * *` a **`0 14 * * 1-5`**. `cron.timezone` está en `GMT`, por lo que conserva **08:00 de Ciudad de México**, ahora únicamente de lunes a viernes. El job continúa activo.

Se modificó mediante `cron.alter_job`, sin borrarlo ni recrearlo. La transacción comprobó que el resto de la fila (incluido el comando de invocación) y los demás jobs permanecieran iguales. El job anual de generación de ocurrencias conserva su programación. No se registró el comando en la auditoría porque puede contener credenciales.

Migración aplicada: `20261031141658_obligation_summary_weekdays.sql`. La versión local se reconcilió con la asignada por el historial remoto. Auditoría: `obligation_summary_weekdays_20261031`, con horarios anterior y nuevo, zona horaria y motivo. El actor de aplicación queda como sistema (`user_id=NULL`), sin atribuirlo a una sesión de la app.

La comprobación posterior independiente confirmó el horario, el estado activo, la auditoría y el historial de migración. **No se ejecutó el job ni se enviaron correos de prueba.** Tampoco se modificaron obligaciones, fechas, cumplimientos o evidencias.

## Alcance y publicación

Aplica al resumen automático de obligaciones invocado por el cron. No cambia los correos de bienvenida, mensajes, revisiones privadas ni envíos manuales. No se modificaron Edge Functions ni la interfaz: no requiere redespliegue de funciones o publicación en Lovable.

Fuente de operación: [Supabase Cron: editar un job](https://supabase.com/docs/guides/cron/quickstart#edit-a-job). Cron usa la convención de días de semana `1-5` para lunes a viernes; a las 14:00 UTC corresponde el mismo día civil en Ciudad de México.
