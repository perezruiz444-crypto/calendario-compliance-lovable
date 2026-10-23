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

### Acuerdo vigente: revisión mensual de buzón y listados fiscales

Aplicado en producción y comprobado: 12 controles en seis empresas, dos nuevas versiones de catálogo aprobadas operativamente con normativa pendiente, frecuencia mensual y ventana interna 21–23. Migración `20261019225748_monthly_internal_reviews.sql` aplicada; operación `scripts/operations/revisiones-mensuales-20261019.sql` ejecutada una vez con auditoría privada homónima. Quedaron 33 revisiones mensuales internas de octubre a diciembre; no se vuelve a exigir el mes cuando ya hay una marca del mismo control vinculada a una ocurrencia de ese mes. Se conservaron las ocurrencias semanales como antecedentes excluidos de entregas exigibles por su tipo condición y origen heredado. La programación mensual futura se genera con la misma función anual protegida, sin habilitar cálculo normativo pendiente. No se alteraron marcas existentes ni fechas pasadas. Se añadió únicamente el cumplimiento de agosto de listados de ITW con autor administrador, fecha real de registro y nota de conciliación por confirmación expresa, sin archivo ni acuse inventado. Conteo posterior: 102 cumplimientos, todos los 101 anteriores intactos. Cero periodos existentes sin marca hasta septiembre en estos controles y cero ventanas internas incorrectas. No se crearon meses históricos faltantes ni nuevos cumplimientos de octubre.

Validación: pruebas PostgreSQL sintéticas de ventana, inmutabilidad del historial, respeto de marcas semanales/mensuales y fechas normativas, idempotencia, ausencia de retroactividad y rechazo entre empresas correctas; regresión del generador normativo correcta. Asesor de seguridad conserva los mismos avisos existentes (3 funciones accesibles a anon, 25 a authenticated, protección de contraseñas filtradas deshabilitada y una tabla de servicio con RLS sin políticas). Sin nuevas tablas, sin ampliación de grants y sin cambios Auth. Falta integrar este código y evidencia mediante PR/CI/merge y comprobar la vista publicada de Lovable.

El administrador cambió el criterio anterior y confirmó expresamente el alcance para todas las empresas: Buzón tributario y Artículo 69 del CFF deben tener revisión mensual interna. Este acuerdo sustituye la frecuencia semanal antes aprobada para buzón. Mantener la diferencia entre condición continua y revisión interna mensual; no presentar cada revisión como una entrega legal autónoma. Conservar antecedentes y no acreditar revisiones automáticamente. La descripción del registro Artículo 69 menciona 69-B, por lo que debe verificarse y precisarse su alcance normativo sin asumir que 69 y 69-B son intercambiables. El administrador confirmó posteriormente la ventana del 21 al 23 para ambos controles y la atención de los periodos existentes hasta septiembre incluido agosto; octubre queda por revisar, conservando sus marcas anteriores. El acuerdo fue aplicado y verificado como se detalla a continuación.

### Candidato a conciliación: reporte mensual INEGI y producción IMMEX

Aplicación posterior autorizada y verificada: se ejecutó `scripts/operations/conciliar-inegi-20261019.sql`. Se desactivaron únicamente los cinco registros repetidos de producción IMMEX, con una nota de conciliación y relación de evidencia compartida hacia su antecedente desde INEGI de la misma empresa. Quedan seis INEGI activos y cero registros de producción IMMEX activos. Las tres marcas del duplicado ya tenían correspondencia exacta en INEGI (ITW agosto/septiembre; Johnson octubre); no se trasladó ni creó ninguna marca. Los 101 cumplimientos presentes al ejecutar la operación, todas las ocurrencias y las demás obligaciones conservaron íntegro su contenido, comprobado por huellas antes/después dentro de la transacción y en consulta posterior. El aumento respecto de conteos anteriores corresponde al estado encontrado, no a esta operación. Auditoría privada `conciliacion_inegi_duplicados_20261019` conserva las cinco filas originales, correspondencias y huellas. El historial previo sigue consultable desde los registros inactivos; no se implementó una vista de historial combinado. Las fechas, fundamento y separación del anual siguen pendientes; no se tocó el catálogo compartido ni se aprobó una regla normativa.

El administrador aclaró que Reporte Mensual de Producción IMMEX corresponde al mismo reporte mensual enviado a INEGI y pidió revisar la captura. Se comprobó que ambas definiciones conviven activas en ITW, Johnson Electric, Tokaikogyo, Wealth y Xinquan; Balluff solo tiene INEGI activo. La definición de producción dice presentar ante SE y tiene una excepción operativa de condición en ITW, mientras las otras cuatro empresas conservan clasificación periódica. Revisar identidad del reporte y fuente oficial, corregir destinatario y clasificación cuando se sustenten, y conciliar por empresa y periodo antes de consolidar seguimiento. Conservar cumplimientos, autores, evidencias e historial; no duplicar entregas ni extender marcas a otros periodos. El anual INEGI tras notificación requiere revisión separada. No se fusionaron ni modificaron obligaciones en esta comprobación.

### Acuerdo posterior: controles de inventarios de ITW

Tras la instrucción explícita de quitar la entrega anual heredada, se comprobó en producción que ambos controles ya tienen tipo efectivo `condicion` y frecuencia de catálogo `EVENTUAL`. IMMEX no tiene ocurrencias; PROSEC conserva una ocurrencia histórica heredada del 01/01/2026. La política compartida de seguimiento excluye las ocurrencias heredadas de condiciones de las entregas y del calendario, y el gestor corregido conserva acceso al historial. Por tanto, no hace falta borrar ni modificar aquella ocurrencia para retirar su exigencia como entrega anual. No se cambiaron registros ni cumplimientos en esta verificación. Sigue pendiente comprobar la publicación manual del gestor corregido en Lovable antes de afirmar que toda la interfaz pública lo muestra así.

El administrador confirmó que ambos registros denominados Control de inventarios son condiciones permanentes: PROSEC (utilizar sistema informático registrado en contabilidad) e IMMEX (control automatizado, Anexo 24), ambos descritos como exigibles en todo momento. Deben conservarse separados por alcance y referencia; esta confirmación no autoriza fusionarlos ni acredita una revisión realizada. Las fechas anuales heredadas no deben convertir estos controles en entregas anuales vencidas. Se conserva el historial y sigue pendiente la validación normativa correspondiente. No se modificaron datos de producción al documentar este acuerdo.

### Acuerdo posterior: INEGI pendiente de comparar

El administrador precisó después el criterio de fechas del reporte mensual: conservar el día 20 como límite indicado y calcular por separado un objetivo interno en el último día hábil anterior al 20, en lugar de fijar siempre el día 17. La implementación debe considerar fines de semana y el calendario de días inhábiles aplicable, cuya fuente y alcance aún deben verificarse. No debe presentar el adelanto interno como prórroga o vencimiento legal validado ni recalcular periodos históricos sin conciliación. Ejemplo, considerando lunes a viernes y sujeto a inhábiles aplicables: octubre de 2026, objetivo lunes 19; diciembre de 2026, viernes 18. Este acuerdo está documentado, todavía no implementado en producción.

Al retomar la revisión, el administrador confirmó como criterio operativo que el reporte mensual aplica a todas las empresas IMMEX. Se conserva esta confirmación para la comparación entre empresas; no sustituye la validación normativa, no fija vencimientos ni acredita entregas históricas. La revisión del reporte anual tras notificación sigue separada y pendiente. Esta anotación no modifica datos de producción.

El administrador pidió dejar INEGI como **pendiente de comparar** entre las empresas IMMEX, comenzando por Balluff. El catálogo describe una entrega mensual y otra anual tras notificación; la descripción mensual menciona los primeros 20 días naturales y la configuración contiene día 17. No existe regla aprobada para esta definición. Se debe comparar el alcance por empresa, separar ambos reportes y verificar fuentes oficiales antes de confirmar aplicabilidad o fechas. No se cambió INEGI ni se marcaron sus periodos como cumplidos.

Para buzón tributario se aprobó usar condición permanente y revisión semanal interna en las empresas con el mismo control, conservando antecedentes. Este acuerdo todavía requiere implementación y verificación; no equivale a validación normativa ni acredita revisiones pendientes.

Deno check correcto y cuatro pruebas de límites de autorización sin permiso de red: secreto interno, método, lista cerrada y expiración. Preflight remoto sin crear cuenta; llamada anónima rechazada; perfil, rol, empresa y aceptación SMTP comprobados para las dos cuentas. RLS de auditoría exclusiva de administradores comprobada.

El asesor de seguridad se consultó: informa sobre funciones SECURITY DEFINER existentes y [protección de contraseñas filtradas deshabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se añadieron funciones SQL ni se alteraron permisos o configuración Auth. El aviso informativo de revision_programas_envios sin políticas coincide con su acceso reservado a servicio. La revisión de las funciones existentes se rige por las guías de [ejecución pública](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [ejecución autenticada](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable); no se revocaron APIs de la aplicación por el solo aviso.

El frontend de separación de configuración y seguimiento ya está integrado en el PR anterior, con CI del PR y de main correctos. Sigue pendiente Publish/Update manual de Lovable. Estas operaciones de datos y las altas no requieren publicación del frontend ni volver a enviar la revisión de Fernanda.
