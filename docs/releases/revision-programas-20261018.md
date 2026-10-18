# Revisión provisional y correos de clientes

Los resúmenes de clientes excluyen ocurrencias heredadas y fechas normativas sin su versión de regla aprobada/validada. Las revisiones internas conservan su etiqueta de objetivo interno. Administración y consultores mantienen los pendientes de revisión. Este filtro no cambia datos ni acredita cumplimiento.

La clasificación operativa de seis definiciones PROSEC y tres excepciones por obligación se versiona provisionalmente. Cancelación se enlaza como riesgo a controles/reporte de la misma empresa. Informe semestral sigue sujeto a revisión: no se borra por falta de fuente. No se recalculan fechas heredadas, no se valida normativa automáticamente ni se alteran cumplimientos.

El informe para Fernanda enumera las 74 definiciones y observaciones por programa. Debe entregarse como mensaje privado del administrador a Fernanda. La propuesta no es una aprobación legal de IMMEX/CERTIVA ni sustituye la revisión de aplicabilidad por empresa.

Despliegue: aplicar las dos migraciones revisadas antes de desplegar las funciones. El frontend no cambia. Publicar el mensaje y crear una notificación privada; verificar RLS como Fernanda y como otro usuario antes de enviar el correo.

El aviso se envía con `send-review-notification` desde una invocación interna explícita con `x-cron-secret` usando Vault; no requiere ni suplanta una sesión de navegador. Está limitado a los dos participantes autorizados. La PK del registro de entrega impide un segundo intento concurrente o automático. Una respuesta incierta requiere inspección manual; SMTP aceptado no demuestra lectura ni entrega final al buzón. No invocar el resumen diario para probarlo: enviaría a usuarios reales.

Validación local: 44 pruebas de datos/presentación, TypeScript, lint (0 errores/59 advertencias existentes), build y Deno check. Contrato SQL sintético en transacción revertida: dos aplicaciones idempotentes, tres overrides efectivos, dos relaciones de riesgo sin duplicación, normativa pendiente y tabla de correo inaccesible a anon/authenticated. No acredita replay completo del esquema Supabase.

Rollback: revertir funciones desde el commit anterior; las clasificaciones aprobadas son inmutables, por lo que se restaura la clasificación anterior mediante otra versión explícita, nunca borrando historial. No borrar cumplimientos. El aviso a Fernanda no se puede retirar de su correo una vez aceptado por SMTP.
