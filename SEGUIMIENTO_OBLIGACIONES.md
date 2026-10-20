# Seguimiento de revisión de obligaciones

Última actualización: 20 de octubre de 2026, hora de Ciudad de México.

## Punto de continuidad

La revisión se basa en la tabla de **19 periodos sin clasificación aprobada y 37 periodos periódicos** compartida por el administrador. Es la referencia para continuar; no reiniciar desde cero ni sustituirla por una revisión general sin conservar lo ya decidido. Se trabaja por empresa y obligación, reutilizando criterios únicamente cuando su alcance corresponde. La empresa en revisión es **ITW**; Balluff ya tiene criterios revisados y la configuración acordada de INEGI fue aplicada posteriormente en las seis empresas.

**Siguiente pendiente concreto:** revisar la extensión del control interno de valoración por muestreo a Wealth (1 periodo). INEGI ya se revisó y su configuración mensual/anual se aplicó en las seis empresas: no repetir su aprobación. También falta revisar en otras empresas los criterios de inventarios, registros y mermas aprobados solo para ITW.

**Aclaración de continuidad del administrador:** buzón tributario e INEGI ya se revisaron en la sesión anterior. Los nueve periodos de INEGI cuentan como pendientes técnicos de implementación y conciliación, no como nueve decisiones nuevas ni como motivo para repetir la revisión con el usuario.

**Comprobación previa a la aplicación de INEGI (20/10/2026), conservada como antecedente:** buzón tiene frecuencia mensual, regla aprobada de condición y revisiones internas del 21 al 23 en las seis empresas. INEGI tiene frecuencia mensual, pero conserva día 17, descripción mensual/anual, próximas fechas heredadas 17/11 y 17/12, sin regla de catálogo ni excepciones particulares aprobadas. La frecuencia mensual ya estaba; la configuración completa acordada no está aplicada. No se modificaron datos en esta comprobación. No se pudo contrastar la pantalla visible del administrador porque la captura no está disponible en este host; no afirmar haber visto su interfaz.

Este archivo distingue decisiones, cambios realmente aplicados y pendientes. Clasificar un registro no acredita que la empresa haya cumplido, y una fecha heredada sin marca no demuestra un incumplimiento legal. Los conteos iniciales se conservan como referencia histórica, no como contadores actuales de vencidos.

## Los 19 periodos sin clasificación aprobada: referencia y avance

| Registro | Periodos iniciales | Acuerdo | Aplicación verificada y pendiente |
|---|---:|---|---|
| Buzón tributario | 6 | Condición continua con revisión interna **mensual del 21 al 23**, para todas las empresas. Sustituye el acuerdo anterior de revisión semanal. | Aplicado en las seis empresas mediante regla compartida. Se conservan semanas antiguas como antecedentes, fuera de las entregas exigibles. No se acreditaron nuevas revisiones de octubre. |
| INEGI | 9 | Administrador confirma reporte mensual para las empresas IMMEX; separar el anual tras notificación. Límite indicado: día 20; objetivo interno: último día hábil **anterior** al 20. | **Configuración operativa aplicada y verificada en las seis empresas.** Mensual clasificado como periódico; catálogo y presentaciones corregidos al día 20. Fechas futuras noviembre/diciembre: 20/11 y 20/12, con objetivos internos 19/11 y 18/12. Anual separado por evento de notificación, con seis seguimientos y cero entregas generadas sin notificación. Marcas y fechas históricas intactas: los nueve periodos no se marcaron como cumplidos. Normativa integral sigue pendiente; fechas futuras identificadas como planificación interna con calendario federal de referencia 2026/2027. |
| Artículo 69 del CFF | 1 | Condición continua con revisión interna **mensual del 21 al 23**, para todas las empresas. Administrador confirma atención hasta septiembre, incluido agosto. | Aplicado en las seis empresas. Se añadió solo la marca faltante de agosto de ITW con nota de confirmación expresa, autor y fecha real de registro, sin archivo inventado. El texto capturado menciona 69-B: precisar fundamento y alcance respecto de empresa/proveedores sin confundirlo con 69. |
| Declaración de Valor — Muestreo | 3 | Administrador confirma que es **revisión interna mensual de expedientes**, no declaración mensual legal ante autoridad. | Aplicado **solo en ITW**, que concentra 2 periodos. Nombre actual: «Valoración aduanera — revisión interna por muestreo»; control interno con revisiones mensuales. Se conservó el día 17 ya capturado como objetivo interno futuro, sin atribuirlo a plazo legal. **Wealth conserva 1 periodo sin clasificación aprobada**. No se acreditó agosto/octubre automáticamente. |
| **Total de referencia** | **19** | | |

Comprobación de producción al elaborar este archivo, usando el mismo corte histórico de fechas anteriores al 19/10/2026: tras aplicar INEGI, de ese grupo **solo 1 periodo sigue sin clasificación aprobada: muestreo de Wealth (octubre)**. Los otros 18 tienen criterio de clasificación aplicado; esto no significa que se hayan marcado 18 cumplimientos. La única marca añadida por conciliación fue agosto del control fiscal de ITW.

Distribución histórica de los nueve periodos INEGI ahora clasificados, sin acreditar sus cumplimientos: Balluff 3 (agosto, septiembre, octubre); ITW 1 (octubre); Tokaikogyo 3 (agosto, septiembre, octubre); Wealth 1 (octubre); Xinquan 1 (octubre). Muestreo pendiente en Wealth: octubre.

### Aplicación de INEGI: evidencia técnica

Se leyó la regla 3.2.17 en el PDF oficial del Acuerdo SE original, DOF 09/05/2022: mensual dentro de los primeros veinte días naturales del mes siguiente, o anual tras notificación cuando corresponda. Se separaron los supuestos sin convertirlos en dos entregas automáticas. [Fuente oficial](https://dof.gob.mx/2022/SEECO/SEDECO_090522.pdf). No se etiquetó la norma como validada integralmente porque falta cotejar reformas posteriores.

El calendario para adelantar el objetivo interno usa lunes a viernes y los descansos federales del artículo 74 de la [LFT consultada](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf), con años 2026/2027 explícitos. Es planificación interna, no una validación del calendario jurídico de INEGI; cierres locales o extraordinarios requieren incorporarse. Si no existe calendario configurado para un año, el generador no inventa sus objetivos. No se recorrió ningún vencimiento legal por un fin de semana.

Migración `20261020183637_inegi_operational_schedule.sql` aplicada; operación `scripts/operations/inegi-separar-mensual-anual-20261020.sql` aplicada una vez y auditada con acción `inegi_mensual_anual_20261020`. Se creó una definición anual separada: ahora hay 87 definiciones históricas, incluidas las retiradas; no afirmar que siguen siendo exactamente 86. Pruebas SQL locales con datos ficticios: fines de semana, feriado, objetivo estrictamente anterior, respeto de marcas y fechas normativas, historial intacto, idempotencia, rechazo entre empresas y ausencia de generación para años sin calendario. Pasaron también las regresiones de revisiones mensuales y del generador normativo. Asesor de seguridad sin nuevos grupos ni conteos de avisos.

## Los 37 periodos periódicos: referencia y avance

| Registro | Periodos iniciales | Decisión y situación verificada |
|---|---:|---|
| Registros Autopartes | 7 | **ITW:** condición permanente aplicada; mantener registros automatizados, conservarlos y proporcionarlos a requerimiento. Sin entrega mensual. Las otras cuatro empresas con asignación activa conservan tipo periódico: falta revisar y aplicar el criterio donde corresponda. |
| Registros Automotriz | 6 | **ITW:** condición permanente aplicada, con aplicabilidad operativa confirmada por administrador. Sin entrega mensual. Otras cuatro empresas conservan tipo periódico. Mantener separados alcance automotriz terminal/fabricante de vehículos y alcance de autopartes; no fusionar por nombre. |
| Expedición de constancias — Automotriz | 5 | Administrador reconoce el documento y confirma frecuencia **mensual en ITW**, que ya estaba configurada. No se marcaron entregas anteriores. Falta validación integral del fundamento, formato y fecha capturados, y revisión de los demás casos. |
| Reporte mensual de producción IMMEX | 5 | Administrador confirma que corresponde al reporte de INEGI. Se desactivaron cinco seguimientos duplicados en ITW, Johnson Electric, Tokaikogyo, Wealth y Xinquan. Las tres marcas del duplicado ya estaban reflejadas en INEGI para esos mismos periodos (ITW agosto/septiembre; Johnson octubre). No se trasladaron ni crearon marcas. **Atención:** la definición duplicada sigue activa en el catálogo aunque tiene cero asignaciones activas; falta resolver su disponibilidad para nuevas empresas. |
| Constancia de destrucción de mermas IMMEX | 4 | **ITW:** trámite por evento aplicado; no exigir entrega trimestral si no hay evento registrado. Norma, autoridad receptora y plazo no se validaron por este cambio. Las otras cuatro empresas conservan tipo periódico; falta revisar la extensión. No se creó ningún evento ni cumplimiento. |
| Informe trimestral de inventarios IMMEX | 4 | **Retirado de todas las empresas.** Catálogo inactivo/no obligatorio y cinco asignaciones inactivas. No apareció en ninguna hoja de los cinco Excel. Su origen fue una plantilla SQL inicial, no el Excel del administrador. El fundamento capturado no acreditó la entrega trimestral. Se conserva la marca histórica de ITW y todo el historial. El control real automatizado de inventarios permanece separado. |
| Declaración mensual IVA/IEPS | 3 | **Pendiente de revisión.** La definición de certificación está activa en Tokaikogyo. Comparar con otras definiciones de IVA mensual, distinguir alcance y no fusionar sin conciliación. |
| Reportes mensuales CERTIVA sobre cambios | 3 | **Pendiente de revisión.** Asignación activa en Tokaikogyo. Comprobar qué cambios, supuesto, periodicidad y fundamento corresponden; no asumir una entrega mensual por el nombre. |
| **Total de referencia** | **37** | Los cambios de tipo, retiros y completados hacen que este total histórico no equivalga al estado actual. No recalcularlo silenciosamente. |

## Otras decisiones aplicadas durante esta revisión

- **Control de inventarios IMMEX y PROSEC de ITW:** ambos son condiciones permanentes. Ya tienen frecuencia de catálogo EVENTUAL y tipo efectivo condición. IMMEX no tenía ocurrencia; PROSEC conserva la anual heredada de 01/01/2026, excluida de las entregas exigibles por la política de presentación. No se borró ni marcó ese antecedente. Mantener ambos controles separados por alcance.
- **Renovación Anual Programa IMMEX:** retirada del catálogo activo y de las seis empresas que la tenían. No se encontró una solicitud anual en los cinco Excel; también provino de la plantilla inicial. Conservar autorización IMMEX y reporte anual real de ventas/exportaciones; seis reportes anuales siguen activos. No se eliminó historial ni cambió una marca.
- **Autorización IMMEX de ITW:** reactivada como condición con su antecedente, sin inventar una revisión actual ni crear entrega anual.
- **Antecedentes de buzón de ITW:** tres marcas antiguas conservadas; las dos de mayo corresponden a una revisión, sin extender cobertura a semanas posteriores.
- **Constancias de transferencia de Tokaikogyo:** tres periodos heredados (julio/agosto/septiembre) no prueban eventos. La empresa debe registrar sus operaciones. No marcar cumplido ni «no aplica» automáticamente.
- **Elastomer:** empresa y registros eliminados por autorización expresa, ya verificado. No repetir la operación. Eliminarla redujo el grupo inicial de 65 a 61 periodos en seis empresas.
- **Xinquan:** Andrea López y Víctor de Santos tienen cuentas de cliente vinculadas a su empresa y bienvenidas aceptadas por SMTP. No recrear usuarios ni reenviar correos. No hay confirmación de lectura.
- **Fernanda:** última comprobación de la sesión anterior: informe sin leer y sin respuesta. No reenviar por defecto; verificar de nuevo si se solicita seguimiento.

## Límites y decisiones que no deben confundirse

1. El alcance **para todas las empresas** se aprobó expresamente para buzón, listados fiscales y retiro del informe trimestral. El retiro de renovación anual IMMEX se aplicó a las seis asignaciones de esa plantilla y a su catálogo.
2. Los cambios de registros Automotriz, Autopartes, mermas y muestreo fueron **particulares de ITW**. No están aplicados automáticamente a otras empresas porque sus reglas particulares conservan prioridad sobre el catálogo.
3. La clasificación operativa aprobada no equivale a normativa validada. La aplicabilidad operativa de los registros de ITW fue confirmada por el administrador; no volver a dejarla «por confirmar» sin un motivo nuevo, ni presentar esa decisión como validación normativa integral.
4. No se completaron obligaciones para probar. La marca de agosto fiscal de ITW fue una conciliación expresamente confirmada por el administrador. No inventar evidencias, acuses, eventos, revisiones ni cobertura de otros periodos.
5. Las correcciones de interfaz no acreditan cumplimiento ni validan fechas. Las fechas históricas no se recalcularon. Los objetivos internos deben diferenciarse de vencimientos legales.
6. El informe trimestral se investigó con una fuente equivocada al principio: la regla 4.3.1 trata el control permanente; no es el fundamento de un informe trimestral. Se corrigió y se comprobó el artículo capturado en la publicación original del decreto antes del retiro autorizado.

## Evidencia y fuentes

- [Detalle operativo del 19 de octubre](docs/releases/operaciones-clientes-20261019.md).
- [Decisiones de ITW del 20 de octubre](docs/releases/revision-itw-20261020.md).
- [Organización y conciliación de obligaciones](docs/releases/organizacion-conciliacion-obligaciones-20261019.md).
- [Informe enviado para revisión de Fernanda](docs/releases/revision-programas-fernanda-20261018.md).
- Excel: `Catalogo de obligaciones/Checklist CERTIVA + immexRussellBedford 2026.xlsx`, hoja `IMMEX_Obligaciones`: C14 control automatizado; C16 reporte anual; C17 INEGI. **C16/C17 no son informe trimestral.**
- Cinco Excel cotejados: el checklist anterior; `Catalogo de obligaciones/ Checklist_CertificacionIVA_IEPS_RB vSC.xlsx`; `Catalogo de obligaciones/OBLIGACIONES.xlsx`; `OBLIGACIONES_UNIFICADO.xlsx`; `OBLIGACIONES_CATEGORIZADO.xlsx`. No llamar «oficial» a un Excel privado como si su contenido fuera una publicación normativa.
- Plantilla inicial donde se localizaron añadidos: `supabase/migrations/20260325100002_sprint1_catalogo_seed.sql`, introducida en el catálogo inicial del 25/03/2026.
- [RGCE 2026 y Anexo 13 — publicación original DOF 27/12/2025](https://www.dof.gob.mx/nota_detalle.php?codigo=5777199&fecha=27/12/2025): reglas leídas 4.3.1, 4.3.16 y 4.3.19. Falta cotejar reformas posteriores para validación integral vigente.
- [Decreto IMMEX — publicación original DOF 01/11/2006](https://www.dof.gob.mx/nota_detalle_popup.php?codigo=4936351): artículos leídos 10, 12 y 24. No es una compilación consolidada. La fracción IV del artículo 24 trata el destino autorizado; la IX, el control automatizado.
- [Ley Aduanera — Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf): artículo 64 leído; el ejemplar consultado señala última reforma 19/11/2025.

Las operaciones aplicadas y sus comprobaciones están conservadas en `scripts/operations/`. La auditoría privada en Supabase guarda registros anteriores y referencias de reglas. No copiar sus contenidos privados a documentos públicos.

## Integración y publicación: estado real

- Interfaz de separación entre inventario/configuración y seguimiento: PR «Separa controles permanentes de las entregas en la gestión de obligaciones» fusionado, con CI correcto. **Publicación manual de esa versión en Lovable aún no comprobada.**
- Migración de revisiones internas mensuales aplicada en Supabase y comprobada con datos sintéticos antes de su aplicación. Las operaciones de datos descritas arriba ya están aplicadas y verificadas en producción; no volver a ejecutarlas para «probar».
- Código y evidencias de las operaciones guardados en rama `ops/altas-xinquan-20261019`. Al actualizar este registro, todavía no existe PR abierto de esa rama ni merge a main de estas operaciones. No afirmar que main contiene esos archivos hasta verificar PR, CI y merge.
- La copia disponible es `/workspace/calendario-compliance-lovable`. No se ha podido comprobar ni sincronizar la ruta del Mac indicada originalmente desde este entorno; no afirmar que esa copia está actualizada.
- El cruce general de catálogo/Excel empezó como apoyo, pero **no reemplaza la tabla de 19 y 37** ni autoriza a retirar automáticamente todo lo que no tenga coincidencia textual. El script de lectura `scripts/auditar-catalogo-excel.py` es auxiliar y no valida normativa.

## Actualización del registro

Después de cada decisión, actualizar la fila correspondiente con: alcance por empresa, aprobación, operación aplicada o pendiente, comprobación de conservación de antecedentes y siguiente punto. Cuando se termine un PR, migración, merge o publicación, verificar la etapa antes de actualizar su estado. Mantener este archivo como punto de entrada y los documentos detallados como evidencia histórica; no borrar acuerdos anteriores.
