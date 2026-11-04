# Fechas y recordatorios — 4 de noviembre de 2026

Las fechas `date` conservan su día al mostrarse en pantallas, selectores, PDF y correos. Los vencimientos se comparan por día civil de `America/Mexico_City`: hoy continúa vigente hasta terminar el día. Los timestamps mantienen su semántica de instante.

Los contadores mensuales usan solo las ocurrencias del mes y excluyen obligaciones inactivas y acciones ajenas al modelo V2. El semáforo y los widgets legados consultan la ocurrencia actual. Próximos 30 días carga ese intervalo además de la vista abierta, pagina resultados y excluye cumplidas/canceladas.

Los recordatorios respetan tipo y empresa. Las reglas particulares sustituyen las globales del mismo tipo; una configuración desactivada no recupera los valores por defecto. Los avisos de hoy y atrasos permanecen. Los consultores solo pueden leer reglas globales y de sus empresas asignadas. El resumen agrupa las obligaciones de acuerdo con la anticipación configurada.

Una obligación personalizada con fecha explícita genera una ocurrencia heredada, sin acreditar validación normativa ni inventar recurrencias. Para catálogo, la fecha capturada se registra explícitamente al activar. Las semillas históricas de catálogo no se recuperan automáticamente como nuevos atrasos. Eventos y condiciones conservan sus flujos propios. La activación muestra el número real de fechas registradas. Fechas con historial de cumplimiento no se sobrescriben ni se borran.

## Producción y publicación

Migración `20261104155045_calendar_dates_reminders_manual_occurrences.sql` aplicada y verificada en `svozqrjhwaohfmbkhpig`. Comparación de huellas completas antes/después: 393 ocurrencias, 102 cumplimientos, un evento y cero revisiones intactos. No se crearon periodos a partir de las semillas de enero. Respaldo del contrato previo y huellas conservados fuera de Git.

Se verificaron la función de avisos, el nuevo trigger y la ausencia de permisos anónimos en las nuevas funciones. El asesor de seguridad identifica la nueva RPC autenticada SECURITY DEFINER: su ejecución es intencional, exige autorización sobre la obligación y no concede acceso a otra empresa. Los avisos previos del proyecto no se alteraron.

Despliegue directo verificado: `send-daily-summary` versión 157 y `send-task-notifications` versión 177, ambas activas con su configuración de autenticación anterior. Se descargó el paquete publicado del resumen y coincide con los archivos de origen y sus dependencias utilizadas. La comprobación HTTP sin credenciales no ejecutó envíos.

El workflow de `main` también despliega las Edge Functions con la configuración existente. GitHub Actions dejó la ejecución del PR en cola, sin asignar un runner; la validación local completa pasó. La interfaz requiere [Publish/Update en el editor Lovable](https://lovable.dev/projects/lovp_5x0f73h8az9mvaxdvzf80at05f); integrar código o aplicar la migración no acredita la publicación del sitio público. Esta sesión no dispone de acceso al navegador del editor. El sitio público conservaba el paquete `/assets/index-BoT7lLip.js` antes de integrar.

## Verificación

60 pruebas de datos/UI, TypeScript, lint con cero errores y 59 advertencias del baseline, compilación, Deno y plantillas reales de correo. Las pruebas de fechas usan cinco zonas horarias e incluyen mediodía, medianoche de México y cambio de año. El contrato PostgreSQL sintético valida permisos, alcance por empresa, idempotencia, fechas explícitas, conservación de historial y concurrencia; se inicializó desde una base vacía. No se enviaron correos ni se crearon registros ficticios en producción.
