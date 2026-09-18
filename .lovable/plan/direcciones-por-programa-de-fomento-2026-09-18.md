# Direcciones por programa de fomento

## Objetivo
Dentro de la ficha de cada empresa, permitir registrar, editar y eliminar una o varias direcciones **específicas de cada programa** (IMMEX, PROSEC, Certificación IVA/IEPS, Padrón general, Padrón sectorial), sin tocar el bloque general de "Domicilios de Operación".

## Qué verá el usuario
En cada apartado de programa aparece una nueva sección "Domicilios autorizados":

- En modo lectura: lista de las direcciones registradas (o "Sin domicilios registrados").
- Al presionar el lápiz del apartado (modo edición): campo para escribir una dirección y botón para agregarla, más una X para quitar cualquiera de la lista.
- Las direcciones se guardan junto con el resto del apartado al presionar la palomita, y se descartan al cancelar.
- Solo quien ya puede editar la empresa las modifica; el cliente las ve en modo lectura.

## Alcance
- Ficha de empresa (vista de detalle), apartados: IMMEX, PROSEC, Certificación IVA/IEPS, Padrón de Importadores general y Padrón sectorial.
- El bloque general "Domicilios de Operación" se mantiene igual y sigue sirviendo para direcciones no ligadas a un programa.

## Detalles técnicos
Para que funcione igual en todos los programas se usa **una sola fuente de datos**: la tabla existente `domicilios_operacion`.

1. Migración aditiva: agregar columna `programa text NULL` a `public.domicilios_operacion` (valores: `immex`, `prosec`, `certificacion_iva_ieps`, `padron_general`, `padron_sectorial`; `NULL` = domicilio general, comportamiento actual intacto). Índice por `(empresa_id, programa)`. Sin cambios de RLS (las políticas existentes por empresa ya aplican).
2. Migración de datos aditiva: copiar los valores existentes de `empresas.immex_domicilios` y `empresas.prosec_domicilios` a filas de `domicilios_operacion` con su `programa`, sin borrar las columnas originales (reversible).
3. Nuevo componente `src/components/empresas/DomiciliosProgramaSection.tsx`:
   - props: `empresaId`, `programa`, `canEdit`.
   - carga las filas de `domicilios_operacion` filtradas por `empresa_id` + `programa`; alta/edición/eliminación inline con `toast` (mismo patrón que `DomiciliosCard`).
   - modo lectura con ícono `MapPin` cuando no se está editando.
4. Integración en `EmpresaIMMEXCard`, `EmpresaPROSECCard`, `EmpresaCertificacionCard`, `EmpresaPadronGeneralCard` y `EmpresaPadronSectorialCard`, dentro del cuerpo de su `EditableInfoCard`.
5. `DomiciliosCard` (general) se filtra a `programa IS NULL` para no duplicar lo que ya se ve en cada programa.
6. Sin cambios en la lógica de obligaciones ni en permisos.
