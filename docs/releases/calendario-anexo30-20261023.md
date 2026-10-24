# Calendario Anexo 30 — 23/10/2026

## Comportamiento

La ficha de empresa y Pendientes muestran «Calcular plazo» en las dos definiciones canónicas del Anexo 30 que la empresa tenga asignadas. No se asignan automáticamente a otras empresas.

- **Inventario inicial:** capturar el inicio real de vigencia de la certificación o aceptación de garantía. Plazo base: treinta días naturales posteriores. Al confirmar, se registra el evento real y su plazo; no se acredita su transmisión. No admite guardar inicios futuros ni generar atrasos retroactivos.
- **Descargos:** seleccionar mensual o bimestral y el primer mes de operaciones. El cierre se calcula al final de ese mes o del segundo mes; el plazo base termina al final del mes calendario siguiente al cierre. Al guardar se crea solo ese periodo pendiente. No genera todos los meses desde la certificación ni afirma que existieron operaciones. La opción seleccionada se conserva en el snapshot del periodo y no sustituye la regla general del catálogo.
- Se muestran periodo de operaciones, plazo base y límite ajustado. La prórroga al siguiente hábil requiere calendario fiscal verificado. No se adelanta el límite legal como si fuera un objetivo interno.
- Si falta cobertura del calendario, se muestra el plazo base y se bloquea generar el vencimiento. La cobertura corroborada llega al **30/11/2026**; no presupone vacaciones de diciembre ni calendario 2027. Ampliar mediante una nueva versión compartida, con fuentes oficiales vigentes.
- Reintentos no duplican el periodo o inicio. Un periodo mensual y uno bimestral que se solapan en este seguimiento no se guardan simultáneamente. Si existen modalidades distintas por destino aduanero, requieren modelar ese alcance explícitamente antes de usar seguimientos paralelos; no se presume equivalencia de operaciones distintas.
- Los clientes pueden registrar seguimiento de sus obligaciones activas sin asignación personal. El servidor comprueba acceso por empresa. No se permite crear, editar ni eliminar obligaciones mediante este diálogo. Administradores y consultores conservan su alcance habitual.

## Fuentes contrastadas y alcance de validación

- [Anexo 30 RGCE 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/anexos/Anexo30delasRGCEpara2026.pdf), I a)-b): treinta días naturales; inventario aun en ceros. III a): mensual y/o bimestral dentro del mes calendario siguiente al cierre. III c): fecha de cierre según destino.
- [CFF](https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf), artículo 12: cómputo por periodos y prórroga al siguiente día hábil si el término es inhábil. No se aplica la prórroga especial de viernes para pagos a estos informes.
- [RMF 2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf), 2.1.6, y [primera modificación del 09/07/2026](https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf): inhábiles adicionales y vacaciones publicadas. Segundo y tercer textos modificatorios consultados en la revisión anterior no modifican esa regla.

Se valida únicamente este cálculo y la cobertura explícita del calendario. No valida integralmente el catálogo, autorizaciones de las empresas, cumplimiento del inventario inicial, elección histórica de periodicidad ni operaciones realizadas.

Ejemplos con el calendario corroborado: mensual de septiembre tiene plazo base **31/10/2026** (sábado) y límite ajustado **02/11/2026**; bimestral septiembre–octubre tiene límite **30/11/2026**. El anterior ejemplo de 31 de octubre era el plazo base, no el término prorrogado.

## Implementación y verificaciones

- Migración aditiva `anexo30_calendar`: cálculo protegido, vista previa autenticada y registro explícito del periodo. Conserva el comportamiento genérico de eventos de otras obligaciones. El trigger especial del inventario inicial omite crear vencimientos pasados.
- Operación idempotente `anexo30_validar_calendario_20261023`: añade dos versiones de regla compartidas; no sobrescribe versiones previas ni genera eventos, periodos o cumplimientos al desplegar.
- El límite de cada periodo se guarda con snapshot de regla, periodo de operaciones y plazo base. Se audita la programación de descargos.
- Pruebas: 53 pruebas de datos/UI, TypeScript, contrato PostgreSQL sintético completo y concurrencia preexistente, navegador con transporte local simulado y red remota bloqueada, lint (0 errores/59 advertencias existentes) y build. Los tests nuevos verifican autorización por empresa, años bisiestos, cruces de año, feriados, cobertura, idempotencia, solapamientos, bloqueo retroactivo y conservación de cumplimientos.
- No se prueban cumplimientos ni eventos con empresas reales. La verificación de producción usa consultas de lectura y huellas del contenido, no altas de prueba.

## Publicación

Los cambios de interfaz requieren publicación manual en Lovable después de integrar el PR. No hay cambios en Edge Functions que deban desplegarse. Verificar por separado CI, merge, migración aplicada y publicación de la interfaz; no confundir esas etapas.

## Estado aplicado y comprobado

Migración `20261023220304_anexo30_calendar.sql` aplicada en producción con ese mismo identificador en el historial remoto. El archivo se creó mediante CLI y se reconcilió con la versión asignada al aplicarlo por MCP. Operación `anexo30_validar_calendario_20261023` aplicada y auditada: dos versiones compartidas añadidas, cero eventos y cero ocurrencias creadas. Consulta independiente confirmó ejemplos mensual/bimestral y bloqueo fuera de cobertura; huellas completas de cumplimientos, ocurrencias y eventos idénticas al estado previo.

Security advisors: comprobar RPC públicas solo para sesiones autenticadas con autorización de empresa; helper de cálculo y trigger sin ejecución para anónimos o usuarios autenticados. Los [nuevos endpoints autenticados SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) son intencionales para registrar seguimiento mediante permisos acotados; no conceden escritura directa a tablas ni acceso a otras empresas. Los hallazgos previos ajenos al cambio no se alteraron.

Resguardo: [Calcula plazos del Anexo 30 y conserva el historial de la empresa](https://github.com/perezruiz444-crypto/calendario-compliance-lovable/pull/56). Verificar CI/merge antes de reintentar; backend ya aplicado y operación auditada. La publicación manual de la interfaz sigue pendiente.

## Integración verificada el 24/10

PR fusionado y CI de main correcto: `88dd76e4ff7cc277b0c8b2f7f4de8bcf3566f5c8`. La copia de trabajo de `/workspace` se sincronizó por fast-forward. No se verificó ni se anuncia sincronizada la copia del Mac. La publicación manual en Lovable sigue pendiente. El último repaso de cobertura identificó candidatos en Johnson Electric y Xinquan: datos CERTIVA capturados sin seguimientos Anexo 30; consultar el último corte de SEGUIMIENTO_OBLIGACIONES.md antes de activarlos.
