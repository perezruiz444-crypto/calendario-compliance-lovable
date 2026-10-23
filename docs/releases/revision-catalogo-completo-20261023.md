# Revisión operativa completa del catálogo — 23 de octubre de 2026

Punto de entrada: [SEGUIMIENTO_OBLIGACIONES.md](../../SEGUIMIENTO_OBLIGACIONES.md). Revisión operativa de las **88 definiciones históricas**: **80 activas y 8 inactivas**, con **222 asignaciones activas**. No son 217 obligaciones diferentes ni un contador de atrasos.

En esta continuación se ajustaron **38 criterios compartidos** (incluye la nueva separación de inventario inicial), se retiraron de disponibilidad **6 definiciones duplicadas o no acreditadas** y se retiró una asignación duplicada de buzón. Las reglas operativas de las demás definiciones se conservaron tras revisar su contenido; esto no constituye una validación normativa integral ni de aplicabilidad por empresa.

**Clasificación actual del catálogo activo:** Por evento: 20, Entrega por periodo: 12, Condición permanente: 42, Vigencia: 1, Sin clasificación: 3, Consecuencia del incumplimiento: 2.

## Cambios aplicados y comprobados

- CERTIVA de modificaciones: aviso por cambio, durante el mes siguiente; se retira el día 17 fijo como requisito genérico. Los tres periodos originales se conservan, sin acreditar o negar eventos.
- Opinión positiva: condición permanente con revisión interna mensual el día 21 en seis empresas. Solo los objetivos futuros ya existentes incorporaron el origen interno; cero fechas o periodos nuevos.
- Padrones: mantener inscripción/datos y atender trámites por supuesto; se elimina la exigencia genérica de renovación anual.
- Cuotas compensatorias: por operación y resolución aplicable, sin cuota o vencimiento universal.
- PROSEC: renovación automática ligada al informe anual, con texto/frecuencia corregidos. Tres antiguas alineaciones particulares de ITW ahora heredan el catálogo, conservando todas sus versiones.
- Balluff: programa PROSEC previamente registrado con seguimiento de vigencia activo; se completaron cinco seguimientos del catálogo (reporte anual, inventarios, bienes, enajenación y consecuencia), sin fabricar periodos pasados.
- Anexo 30: informes periódicos mensual/bimestral separados del inventario inicial por evento. Se creó una definición de inventario inicial y una asignación en la empresa que ya tenía Anexo 30; cero eventos y vencimientos creados. La empresa debe documentar su opción de periodicidad antes de generar fechas de descargo.
- IMMEX: la causal por mercancías fuera de domicilios se muestra como consecuencia y se vincula a cinco controles de domicilios, que permanecen como condiciones. Aviso de destrucción y acta posterior se distinguen como fases y pueden compartir evidencia.
- Reportes anuales IMMEX/PROSEC: se separa el objetivo interno capturado del 15 de abril de sus límites indicados de mayo/abril, respectivamente. Las ocurrencias históricas no se recalcularon.
- Vigencia CERTIVA: se remite a la resolución real y ventana de renovación, sin asumir anualidad idéntica para todos los rubros. Se corrigen años capturados erróneamente como 2030/2032/2033 y el equivalente incorrecto de un mes como treinta días.
- Referencias fiscales sin asignaciones: DIOT, contabilidad electrónica, ISR retenido y derechos distinguen sus supuestos; no se activaron nuevas obligaciones fiscales en empresas.
- Duplicados retirados del catálogo disponible: mensual de producción IMMEX, IVA mensual sin asignaciones, verificación de opinión positiva, verificación adicional de buzón y requisito general de contacto del buzón. Se conserva el seguimiento general y todas las referencias/antecedentes. La plantilla de reporte semestral de operaciones OEA quedó fuera de disponibilidad por falta de sustento en la cita, sin asignaciones ni historial afectado.

## Decisiones posteriores al corte original

- El administrador decidió **conservar** la declaración anual genérica de comercio exterior. El artículo 32 CFF no acredita por sí solo la entrega consolidada: fundamento y clasificación siguen pendientes; no reabrir su retiro sin nueva instrucción.
- Autorizó **retirar temporalmente OVL de todas las empresas** mientras busca su fundamento. Aplicado en producción: catálogo inactivo/no obligatorio, única asignación ITW inactiva, sus **once cumplimientos intactos**, cero asignaciones activas de OVL. Auditoría `retiro_temporal_ovl_20261023`; SQL guardado en `scripts/operations/retiro-temporal-ovl-20261023.sql`. Todas las huellas de historia y obligaciones ajenas se conservaron. No borrar ni trasladar marcas ni reejecutar la operación.
- Nuevo corte: **88 definiciones históricas, 79 activas, 9 inactivas; 221 asignaciones activas**. Dos definiciones activas sin clasificación aprobada, cinco asignaciones; son la anual conservada y PROSEC semestral. Los conteos del recorrido anterior describen ese corte, no este.
- **PROSEC semestral retirado por instrucción posterior del administrador:** catálogo inactivo y cuatro asignaciones inactivas; su único antecedente conservado. El reporte anual del artículo 8 se mantiene activo en cinco empresas y no cambió. Operación auditada `retiro_semestral_prosec_20261023`, guardada en `scripts/operations/retiro-semestral-prosec-20261023.sql`; todas las huellas de historia y obligaciones ajenas permanecieron iguales. La [guía oficial RAOCE 2026](https://www.snice.gob.mx/~oracle/SNICE_DOCS/RAOCE-2026-PROGRAMAS-DE-FOMENTO_20260423-20260423.pdf) confirma el anual; no se acreditó el semestral en la cita capturada.
- **Corte final tras ambas decisiones: 88 definiciones, 78 activas y 10 inactivas; 217 asignaciones activas.** Solo queda sin clasificación aprobada la declaración anual genérica conservada por instrucción expresa, asignada a ITW. Conservarla no acredita fundamento, periodicidad ni cumplimiento. Próximo dato operativo: opción mensual/bimestral de descargos de Tokaikogyo.

## Casos pendientes en el corte original (ver decisiones posteriores arriba)

| Registro | Asignaciones activas | Situación |
|---|---:|---|
| Declaración Anual de Contribuciones Comercio Exterior | 1, ITW | El artículo 32 CFF consultado regula modificación de declaraciones; no acredita esta declaración anual consolidada. Tiene un antecedente. Aclarar si es control interno o retirar del seguimiento activo, conservando historial. |
| Reporte de Operaciones Vuelta Larga (OVL) | 1, ITW | La cita RMF 3.1.33 no identifica el reporte descrito. No se localizó en los cinco Excel. Conserva once marcas históricas. Requiere identificar el control real o decidir retiro. |
| Informe de Utilización PROSEC | 4 | El informe semestral de la plantilla no se localizó en Excel ni en el decreto consultado; el artículo 8 establece informe anual. Tiene un antecedente de ITW. Aclarar si existe un control interno distinto o retirar, sin borrar historial. |

Las preguntas se presentaron al administrador y siguen pendientes de respuesta. **No se resolvieron por silencio ni se trasladaron sus marcas a otra obligación.** Estas tres definiciones explican las seis asignaciones que aún carecen de clasificación aprobada. No se declaran incumplimientos por ello.

## Límites que siguen vigentes

La clasificación operativa no sustituye la validación normativa. La aplicación empresarial de porcentajes de retorno, mercancías sensibles, régimen, papel de autopartes frente a industria terminal, rubro de certificación, permisos SENER y excepciones depende de autorizaciones y operaciones reales. Se conservaron los alcances operativos expresamente confirmados por el administrador; no se inventó información de las empresas. En especial, la periodicidad mensual/bimestral de descargos debe documentarse con Tokaikogyo. No se cambió una aplicabilidad a “no aplica” para reducir contadores.

No se marcaron nuevos cumplimientos, ni se inventaron acuses o eventos. Las transacciones verificaron huellas del contenido de cumplimientos, fechas y periodos. La segunda pasada comprobó además revisiones y eventos. Se conservan reglas anteriores e inactivos. Las comprobaciones posteriores independientes confirmaron las huellas.

## Fuentes oficiales consultadas

- [RGCE 2026 original](https://sidof.segob.gob.mx/notas/docFuente/5777199), [primera modificación](https://sidof.segob.gob.mx/notas/docFuente/5787425) y [segunda modificación publicada el 22/09/2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/rgce/2daRMRGCEpara2026.pdf). Portal normativo SAT consultado: dos modificaciones publicadas al corte.
- [Anexo 2 RGCE 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo2delasRGCEpara2026.pdf), fichas 62/LA y 102/LA; la modificación de septiembre se contrastó con los supuestos consultados.
- [Anexo 30 RGCE 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo30delasRGCEpara2026.pdf), inventario inicial e informes de descargo. No confundir con Anexo 30 de RMF.
- [Decreto IMMEX, compilación SNICE que incorpora reforma de agosto de 2025](https://www.snice.gob.mx/~oracle/SNICE_DOCS/DECRETO-IMMEX-BIBLIOTECA_20250925-20250925.08.2025%29.pdf), artículos 11, 24, 25 y 27.
- [Decreto PROSEC, compilación SNICE](https://www.snice.gob.mx/~oracle/SNICE_DOCS/Decreto_prosec-Prosec_20240704-20240704.pdf), artículos 7, 8, 9 y 10. Una compilación no sustituye el cotejo integral de reformas.
- [CFF](https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf), [Ley Aduanera](https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf), [LCE](https://www.diputados.gob.mx/LeyesBiblio/pdf/LCE.pdf), [LIVA](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf), [LISR](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf) y [LFD](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFD.pdf), ejemplares publicados por Cámara de Diputados consultados al corte.
- [RMF 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf) y modificaciones publicadas [09/07](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf), [01/10](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/2aRM_RMF2026_01102026.pdf) y [02/10](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/3aRM_RMF2026_DOF_02102026.pdf). No se detectó reforma de las reglas 2.1.24, 2.1.36, 2.8.1.6 y 4.5.1 en esos tres textos publicados.
- [Acuerdo SENER, reforma 18/09/2024](https://sidof.segob.gob.mx/notas/docFuente/5739205), artículo 65. Se identifican supuestos anual/trimestral según permiso; vigencia integral tras reformas energéticas posteriores pendiente, sin empresas asignadas.

## Inventario completo revisado

La columna Excel localiza coincidencias literales del nombre o descripción anterior en los cinco libros; no prueba equivalencia de alcance ni validez normativa. “Sin coincidencia literal” no autoriza un retiro automático. Las fuentes de cada corrección quedan en la regla versionada y en las operaciones SQL; las auditorías privadas conservan el estado anterior.

### cert_iva_ieps

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Aviso CERTIVA de modificaciones de socios y relaciones comerciales | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B92 |
| Avisos cambios inmueble | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B72 |
| Contabilidad electrónica al Portal SAT | Entrega por periodo | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Contratos | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B107 |
| Cumplimiento previo | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B100 |
| Declaración fiscal mensual de IVA | Entrega por periodo | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. Sin coincidencia literal; ver fuente y dictamen. |
| Declaración mensual de IVA | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| DIOT — Declaración Informativa de Operaciones con Terceros | Entrega por periodo | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Entero de ISR retenido a trabajadores | Entrega por periodo | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Fusión (Descargos) | Por evento | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B96 |
| Fusión o escisión | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B67 |
| IMMEX | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · A9 |
| Importar mercancías adicionales | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B73 |
| Informes de descargo — Anexo 30 | Entrega por periodo | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B95 |
| Infraestructura | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B103 |
| Inventario inicial SCCCyG — Anexo 30 | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Inversión | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B99 |
| Obligaciones Certificación | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B65 |
| Pago anual de derechos art. 40 m) LFD (e5cinco) | Entrega por periodo | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Procesos | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B106 |
| Proveedores | Condición permanente | 1 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B101 |
| Renovación de certificación IVA/IEPS según vigencia autorizada | Vigencia | 1 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Requisitos Generales | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. OBLIGACIONES.xlsx · Hoja1 · B74 |
| Requisitos Permanentes | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B93 |
| Retorno mercancías (A) | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B104 |
| Retorno mercancías (B) | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B105 |
| Sensibles (Anexo II/28) | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B108 |
| Solicitud | Por evento | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B97 |
| Trabajadores | Condición permanente | 1 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B98 |
| Verificar buzón tributario en estatus Validado | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar control de inventarios Anexo 24 al corriente | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar CSD vigentes / no ubicarse en 17-H Bis | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar cuotas obrero-patronales IMSS al corriente | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar domicilios de CE registrados y localizados | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar e.firma vigente | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar no estar en listados 69 / 69-B / 69-B Bis CFF | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar opinión de cumplimiento positiva (32-D) | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar padrones sin suspensión | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Verificar socios/accionistas al corriente y no vinculados a cancelados | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |

### general

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Artículo 69 del CFF | Condición permanente | 6 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B4 |
| Buzón tributario | Condición permanente | 6 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B7 |
| Declaración Anual de Contribuciones Comercio Exterior | Sin clasificación aprobada | 1 | Decisión pendiente: uso interno o retiro; no se acredita la entrega capturada. Sin coincidencia literal; ver fuente y dictamen. |
| Opinión positiva de cumplimiento fiscal | Condición permanente | 6 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B2 |
| Pago de Cuotas Compensatorias | Por evento | 1 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Reporte de Operaciones Vuelta Larga (OVL) | Sin clasificación aprobada | 1 | Decisión pendiente: uso interno o retiro; no se acredita la entrega capturada. Sin coincidencia literal; ver fuente y dictamen. |

### immex

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Ajuste anual inventarios | Entrega por periodo | 6 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B55 |
| Autorización del programa | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B10 |
| Beneficio Maquila/PITEX (Sensibles) | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B45 |
| Consecuencias del incumplimiento — mercancías fuera de domicilios IMMEX | Consecuencia del incumplimiento | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B34 |
| Control de inventarios | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B28 |
| Cumplimiento | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B33 |
| Destino | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B17 |
| Destrucción de desperdicios | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B46 |
| Destrucción de desperdicios IMMEX — acta y evidencia | Por evento | 5 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Domicilios | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B23 |
| Expedición constancias (Automotriz) | Entrega por periodo | 4 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B51 |
| INEGI | Entrega por periodo | 6 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B31 |
| INEGI — información anual por notificación | Por evento | 6 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. Sin coincidencia literal; ver fuente y dictamen. |
| Informe Trimestral de Inventarios IMMEX | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| Notificar a la Secretaría | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B24 |
| Rectificación constancias | Por evento | 4 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B54 |
| Rectificación de claves | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B48 |
| Registros Automotriz | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B56 |
| Registros Autopartes | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B53 |
| Renovación Anual Programa IMMEX | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| Reporte anual | Entrega por periodo | 6 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B30 |
| Reporte Mensual de Producción IMMEX | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |
| Requisitos de obtención y conservación del Programa IMMEX | Por evento | 6 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B11 |
| Retorno de autopartes por recepción de constancia C3 — apartado C | Por evento | 4 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B49 |
| Retorno material empaque | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B57 |
| Sensibles | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B16 |
| Temporalidad de retorno | Por evento | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B18 |
| Traslado a submanufactureros | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B47 |
| Trato arancelario preferencial (Cambio Régimen) | Por evento | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B44 |
| Ventas anuales | Condición permanente | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B9 |

### oea

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Matriz interna de seguridad OEA — mantenimiento del perfil | Condición permanente | 0 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Reporte Semestral Operaciones OEA | Inactiva; antecedentes conservados | 0 | Retirada del catálogo disponible. Sin coincidencia literal; ver fuente y dictamen. |

### otro

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Reporte SENER | Entrega por periodo | 0 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B109 |

### padron_general

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Padrón de Importadores — mantener registro y datos actualizados | Condición permanente | 2 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Valoración aduanera — revisión interna por muestreo | Condición permanente | 2 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. Sin coincidencia literal; ver fuente y dictamen. |

### padron_sectorial

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Padrón de Exportadores Sectorial — mantener inscripción vigente | Condición permanente | 3 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |

### prosec

| Definición | Seguimiento actual | Asignaciones activas | Resultado y localización |
|---|---|---:|---|
| Bienes importados | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B63 |
| Cancelación | Consecuencia del incumplimiento | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B60 |
| Control de inventarios | Condición permanente | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B28 |
| Enajenación | Condición permanente | 5 | Se conserva tipo operativo; validar norma y supuesto concreto antes de confirmar fechas. OBLIGACIONES.xlsx · Hoja1 · B64 |
| Informe de Utilización PROSEC | Sin clasificación aprobada | 4 | Decisión pendiente: uso interno o retiro; no se acredita la entrega capturada. Sin coincidencia literal; ver fuente y dictamen. |
| PROSEC — vigencia ligada al reporte anual | Condición permanente | 5 | Criterio ajustado y comprobado; normativa integral pendiente. Sin coincidencia literal; ver fuente y dictamen. |
| Reporte Anual Operaciones | Entrega por periodo | 5 | Criterio ajustado y comprobado; normativa integral pendiente. OBLIGACIONES.xlsx · Hoja1 · B58 |

## Operaciones y resguardo

| Archivo en `scripts/operations/` | Acción de auditoría | Resultado |
|---|---|---|
| `revision-catalogo-controles-20261023.sql` | `revision_catalogo_controles_20261023` | 6 criterios, 18 asignaciones en alcance y 2 duplicados de catálogo retirados. |
| `anexo30-separar-inventario-inicial-20261023.sql` | `anexo30_separar_inventario_inicial_20261023` | Descargos clasificados y una definición/asignación de inventario inicial, sin eventos ni ocurrencias nuevas. |
| `revision-catalogo-descripciones-20261023.sql` | `revision_catalogo_descripciones_20261023` | 26 criterios, 57 asignaciones en alcance, 4 catálogos retirados, un duplicado de buzón retirado, cinco relaciones de riesgo IMMEX y tres alineaciones PROSEC que heredan catálogo. |
| `revision-catalogo-fiscal-sin-asignaciones-20261023.sql` | `revision_catalogo_fiscal_sin_asignaciones_20261023` | 4 definiciones fiscales sin asignaciones; cero entregas creadas. |
| `balluff-completar-cobertura-prosec-20261023.sql` | `balluff_cobertura_prosec_20261023` | 5 seguimientos reutilizados de PROSEC en Balluff, 4 relaciones de riesgo y cero periodos creados. |

Se aplicaron una sola vez en producción y se verificaron después. Los intentos detenidos por precondiciones se revirtieron íntegramente antes de corregir el alcance del guardado: no se forzó una excepción particular ni se reactivó una versión histórica por error. No hay cambios de esquema ni funciones y no corresponde repetir despliegues de esta revisión de datos.

La revisión operativa del inventario está recorrida; el cierre de los tres casos señalados requiere la respuesta del administrador. La validación normativa integral, la selección de periodicidad de descargos y la conciliación de hechos de cumplimiento requieren fuentes/documentos reales adicionales. No presentar el catálogo como normativamente validado o todas las empresas como cumplidas.

Resguardo de esta revisión: [PR #54](https://github.com/perezruiz444-crypto/calendario-compliance-lovable/pull/54). Comprobar su estado de CI/merge antes de cualquier reintento; las operaciones de producción ya están aplicadas y verificadas.
