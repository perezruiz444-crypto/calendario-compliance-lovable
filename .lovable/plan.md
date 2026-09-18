# Direcciones por programa (IMMEX y PROSEC)

## Objetivo
Dentro de la ficha de cada empresa, permitir registrar, editar y eliminar una o varias direcciones **específicas de cada programa**: unas para IMMEX y otras para PROSEC, sin tocar el bloque general de "Domicilios de Operación".

## Qué verá el usuario
En el apartado **Programa IMMEX** y en el apartado **Programa PROSEC** aparece una nueva sección "Domicilios autorizados":

- En modo lectura: lista de las direcciones registradas (o "Sin domicilios registrados").
- Al presionar el lápiz del apartado (modo edición): campo para escribir una dirección y botón para agregarla, más una X para quitar cualquiera de la lista.
- Las direcciones se guardan junto con el resto del apartado al presionar la palomita, y se descartan al cancelar.
- Solo quien ya puede editar la empresa puede modificarlas; el cliente las ve en modo lectura.

## Alcance
- Ficha de empresa (vista de detalle), apartados IMMEX y PROSEC.
- El bloque general "Domicilios de Operación" se mantiene igual.

## Detalles técnicos
- Se reutilizan las columnas existentes `empresas.immex_domicilios` y `empresas.prosec_domicilios` (arreglos de texto ya presentes en la tabla). **No se requiere migración de base de datos.**
- Nuevo componente reutilizable `src/components/empresas/DomiciliosProgramaField.tsx`:
  - props: `value: string[]`, `onChange(next: string[])`, `isEditing`, `label`.
  - modo edición: `Input` + botón "+" (Enter también agrega), chips/filas con botón de eliminar; evita duplicados y cadenas vacías.
  - modo lectura: lista simple con ícono `MapPin`.
- `EmpresaIMMEXCard.tsx`: agregar `immex_domicilios` a `emptyForm`, al `useEffect` de sincronización, al `update` de Supabase y renderizar el nuevo componente en ambos modos.
- `EmpresaPROSECCard.tsx`: mismo patrón con `prosec_domicilios` (siguiendo el estilo ya usado para `prosec_sectores`).
- Normalización: `trim()` en cada dirección; se guarda `[]` cuando no hay ninguna.
- Sin cambios en RLS ni en la lógica de obligaciones.
