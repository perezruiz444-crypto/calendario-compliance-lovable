# Calendario continuo y exportación — 4 de noviembre de 2026

El calendario abre en cuadrícula mensual. Un único chip permite ocultar cumplidas y el encabezado ofrece Descargar .ics. Las obligaciones abren su panel lateral incluso en V2: el periodo seleccionado conserva su identidad, acepta folio/notas y evidencia privada, y se puede completar sin cambiar de mes. Las tareas y los documentos también abren su detalle lateral en la página Calendario.

El panel comprueba permiso en servidor antes de ofrecer registro. Guardar y desmarcar usan las RPC existentes y conservan el historial. Un reintento reutiliza el archivo subido y la operación idempotente. Las revisiones virtuales abren el registro de revisión y nunca completan una ocurrencia antigua por error. Las fechas heredadas e internas conservan su significado. Si la fecha cae en sábado o domingo se muestra Cae en fin de semana; el aviso no cambia el plazo.

## Horizonte y recordatorios

`asegurar_horizonte_calendario` se invoca al consultar el calendario y al iniciar el resumen diario autenticado por cron. Añade solo periodos faltantes entre hoy en Ciudad de México y el mismo día dentro de doce meses, con extremo final exclusivo. No reescribe fechas existentes ni genera atrasos anteriores a hoy o al alta. Los índices únicos hacen seguros los reintentos.

Solo usa reglas aprobadas, alcance resuelto y parámetros completos: recurrencias normativas validadas o revisiones/programaciones internas explícitas. Los eventos, riesgos, vigencias y reglas pendientes no se transforman en recurrencias. Un calendario hábil solo cubre los años o fechas acreditados; no se presume cobertura de 2027 por haber validado 2026. Las reglas incompletas se omiten sin bloquear las demás obligaciones.

Los usuarios solo aseguran periodos dentro de su empresa o asignaciones; el servicio del cron puede mantener el conjunto activo. `dias_recordatorio_calendario` devuelve únicamente empresa, tipo y días efectivos de las empresas accesibles, también para clientes, sin exponer datos privados de las reglas.

## Archivo .ics

Incluye las obligaciones pendientes de la vista actual y sus filtros, con UID estable por acción y alarmas de la configuración efectiva de cada empresa/tipo. Las fechas son de día completo, con fin exclusivo, para preservar el día al importarlas. El texto se escapa y las líneas se pliegan a 75 octetos sin cortar UTF-8. Es una descarga puntual, no una suscripción ni una integración de cuentas.

## Verificación y publicación

68 pruebas de datos/UI, TypeScript, lint con cero errores y las 59 advertencias del baseline, compilación y Deno. El contrato PostgreSQL prueba horizonte mensual/anual, servicio del cron, permisos, cruce de año, idempotencia, conservación íntegra del historial, parámetros incompletos y límite de calendarios hábiles. Se inicializó desde una base sintética vacía.

`npm run test:calendar:browser` comprueba la cuadrícula inicial, el chip, el panel V2 sin navegación, guardar folio/archivo, reintentar sin duplicar evidencia, permisos de consulta, revisiones y documentos, exportación filtrada con alarmas y controles que caben en móvil. Requiere Playwright/Chromium; acepta PLAYWRIGHT_MODULE, CHROME_EXECUTABLE y CALENDAR_EVIDENCE_DIR, igual que las otras pruebas de navegador. La API ficticia solo admite loopback y bloquea red externa.

La migración `20261104164348_continuous_calendar_horizon_and_export_reminders.sql` está aplicada en producción. Aplicarla no genera periodos: huellas completas de las 393 ocurrencias, 102 cumplimientos, un evento y cero revisiones idénticas antes/después. El resumen diario fue desplegado directamente como versión 159 con su configuración de autenticación intacta; el próximo cron actualizará el horizonte. El horario lunes a viernes se conserva. No se enviaron correos ni se añadieron datos de prueba a producción.

Los dos endpoints autenticados SECURITY DEFINER nuevos son intencionales, comprueban alcance por empresa y no están disponibles para anónimos. Las demás observaciones del asesor de seguridad no cambian.

El workflow de funciones fija Supabase CLI 3.0.0, usa destino remoto explícito y confirma su ejecución no interactiva. Corrige el fallo observado de CLI 3 al requerir confirmación en GitHub Actions. Tras integrar, comprobar CI y despliegue. El frontend sigue requiriendo [Publish/Update en Lovable](https://lovable.dev/projects/lovp_5x0f73h8az9mvaxdvzf80at05f); el merge no acredita la publicación del sitio público.
