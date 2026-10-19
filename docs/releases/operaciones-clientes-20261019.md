# Operaciones autorizadas y revisión de empresas — 19 de octubre de 2026

## Elastomer

El administrador confirmó expresamente eliminar también los registros asociados. Se eliminó el expediente, con ocho obligaciones, cinco cumplimientos, 31 ocurrencias y dos tareas. No había usuarios vinculados ni archivos de documentos, tareas o cumplimientos. La primera transacción se revirtió íntegramente por el orden de claves foráneas; la segunda eliminó primero los cinco cumplimientos y después la empresa en una única transacción. Se verificaron hashes completos del resto de empresas, obligaciones, cumplimientos, ocurrencias, tareas y catálogo sin cambios. La autorización y los conteos quedaron en auditoría privada.

Esto es una excepción explícita para Elastomer a la instrucción general de conservar historial; no se aplica a otras empresas.

## Dos altas de cliente de Xinquan

Se crearon y comprobaron dos usuarios con rol exclusivo de cliente y perfil vinculado a Xinquan. Los destinatarios y nombres se conservan únicamente en el encargo de auditoría privada, no en este repositorio. Cada cuenta tiene una contraseña inicial aleatoria que no se guarda en logs ni se comparte; la bienvenida contiene un enlace para establecer la propia contraseña.

Se usó la API administrativa de Supabase Auth desde una operación interna acotada, sin insertar usuarios directamente en auth.users ni suplantar sesiones. El encargo acepta únicamente dos identificadores autorizados, una empresa y el rol cliente; verifica un secreto interno y expira el 20 de octubre a las 00:00 de Ciudad de México. El reclamo atómico en auditoría impide que llamadas concurrentes o repetidas creen usuarios o reenvíen correo. No se devuelve ni registra la contraseña ni el enlace de recuperación.

La primera alta detectó que Auth había dejado el perfil sin empresa pese a conservar app_metadata. Se detuvo antes de generar enlace o intentar SMTP. Se añadió la actualización explícita del perfil recién creado y una recuperación manual limitada a ese fallo previo al correo, comprobando identidad, empresa y rol. No se recreó la cuenta ni se restableció su contraseña. Ambas altas terminaron verificadas y con SMTP aceptado, una bienvenida por destinatario. Esto no confirma recepción final ni lectura.

El código operacional se conserva en scripts/operations y se desplegó explícitamente; no está en el conjunto de funciones desplegadas por el workflow normal, para evitar repetir su despliegue al integrar este registro. El código no contiene destinatarios ni secretos. No invocar esta operación otra vez.

## Distribución vigente de periodos heredados

El diagnóstico anterior de 65 incluía cuatro de Elastomer. Después de la baja quedan 61 periodos pasados sin marca vinculada a la ocurrencia y periodo exactos; no son incumplimientos legales confirmados.

| Empresa | Condiciones | Por evento | Sin clasificación aprobada | Periódicos con normativa pendiente | Total |
|---|---:|---:|---:|---:|---:|
| Balluff | 0 | 0 | 4 | 0 | 4 |
| ITW | 2 | 0 | 6 | 6 | 14 |
| Johnson Electric | 0 | 0 | 0 | 2 | 2 |
| Tokaikogyo | 0 | 3 | 4 | 20 | 27 |
| Wealth | 0 | 0 | 3 | 5 | 8 |
| Xinquan | 0 | 0 | 2 | 4 | 6 |
| Total | 2 | 3 | 19 | 37 | 61 |

Las dos condiciones corresponden a ITW: inventarios PROSEC y la excepción particular de producción IMMEX. Los tres por evento son constancias de transferencia de Tokaikogyo sin evento vinculado; las operaciones concretas debe registrarlas la empresa, sin presumir que ocurrieron o que no ocurrieron.

Los 19 sin clasificación aprobada se distribuyen en buzón (6), INEGI (9), Artículo 69 (1) y Declaración de Valor — Muestreo (3). Los 37 periódicos se distribuyen en Registros Autopartes (7), Registros Automotriz (6), Expedición de constancias (5), Producción IMMEX (5), Mermas (4), Inventarios trimestrales (4), IVA/IEPS (3) y reportes de cambios CERTIVA (3).

Cinco periodos no deben exigirse como entregas recurrentes automáticas. Los otros 56 necesitan precisar clasificación, fundamento, aplicabilidad, fecha o antecedente de atención. No se cambiaron estos datos para bajar contadores. La validación normativa sigue pendiente y debe contrastarse con fuentes oficiales vigentes.

## Validación y publicación

Deno check correcto y cuatro pruebas de límites de autorización sin permiso de red: secreto interno, método, lista cerrada y expiración. Preflight remoto sin crear cuenta; llamada anónima rechazada; perfil, rol, empresa y aceptación SMTP comprobados para las dos cuentas. RLS de auditoría exclusiva de administradores comprobada.

El asesor de seguridad se consultó: informa sobre funciones SECURITY DEFINER existentes y [protección de contraseñas filtradas deshabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se añadieron funciones SQL ni se alteraron permisos o configuración Auth. El aviso informativo de revision_programas_envios sin políticas coincide con su acceso reservado a servicio. La revisión de las funciones existentes se rige por las guías de [ejecución pública](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [ejecución autenticada](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable); no se revocaron APIs de la aplicación por el solo aviso.

El frontend de separación de configuración y seguimiento ya está integrado en el PR anterior, con CI del PR y de main correctos. Sigue pendiente Publish/Update manual de Lovable. Estas operaciones de datos y las altas no requieren publicación del frontend ni volver a enviar la revisión de Fernanda.
