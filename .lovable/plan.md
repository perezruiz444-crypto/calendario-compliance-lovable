## Cambio de comportamiento

El cliente verá **todas las obligaciones activas de su empresa** (igual que el consultor), pero se mantienen las asignaciones en `obligacion_responsables` y toda la lógica de evidencias, cumplimientos, mensajes, etc.

## Cambios

### 1. `src/pages/MiEmpresa.tsx` — traer todas las obligaciones de la empresa

Reemplazar el bloque actual (L67-89) que filtra por `obligacion_responsables.user_id = auth.uid()`:

```ts
// Antes
supabase.from('obligacion_responsables').select('obligacion_id').eq('user_id', user.id),
// ...
.in('id', idsAsignadas).eq('activa', true)
```

Por una consulta directa a `obligaciones`:

```ts
supabase
  .from('obligaciones')
  .select('*')
  .eq('empresa_id', profile.empresa_id)
  .eq('activa', true)
  .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
```

Más una consulta paralela a `obligacion_responsables` filtrada por `user_id = auth.uid()` para saber **cuáles son suyas** (se usa solo para marcar visualmente, no para filtrar).

### 2. Badge "Asignada a ti"

En cada card/fila de obligación en `MiEmpresa.tsx`, si su `id` está en el set de `misAsignaciones`, mostrar badge pequeño en color primary: *"Asignada a ti"*. El resto se muestra sin badge.

### 3. Filtro opcional

Agregar un toggle/tab arriba de la lista: **"Todas" | "Solo asignadas a mí"** (default: "Todas"). Estado local, sin persistir. Permite al cliente concentrarse en lo suyo cuando quiera.

### 4. RLS — verificar que ya permite

La política `Users can view obligaciones of their empresas` en `obligaciones` ya permite al cliente leer todas las obligaciones de su empresa vía `profiles.empresa_id`. No requiere migración.

Igual con `obligacion_cumplimientos` (política `obligacion_cumplimientos_select_scoped` permite ver los de la empresa) y `obligacion_responsables` (política para clientes ya permite ver los de su empresa). Todo intacto.

### 5. Permisos de marcar cumplimiento

La política actual `Clientes can insert cumplimientos for their empresa` permite a cualquier cliente de la empresa marcar cualquier obligación de su empresa como cumplida. **Decidir:**
- (a) Dejarlo así: cualquier cliente puede marcar.
- (b) Restringir vía UI: el botón "Marcar cumplida" / subir evidencia solo aparece si la obligación está asignada al usuario (`misAsignaciones.has(id)`).

Recomendado **(b)** — visibilidad total, pero acción solo sobre las suyas. Sin cambios en RLS, solo gate en el componente.

## Archivos a modificar

- `src/pages/MiEmpresa.tsx` — query nueva, badge, filtro, gate de acciones.

## Lo que NO cambia

- RLS / políticas / esquema: nada.
- Vista del consultor (`EmpresaDetail.tsx`): igual.
- Tabla `obligacion_responsables`: se mantiene y se sigue usando.
- Cumplimientos, evidencias, mensajes, dashboard: igual.

## Verificación

1. Como Marlene en `/mi-empresa`: ver las ~30 obligaciones de ITW, con badge "Asignada a ti" en las 2 suyas.
2. Toggle "Solo asignadas a mí" → filtra a 2.
3. Botón "Marcar cumplida" / subir evidencia: solo visible en las 2 asignadas.
4. Como Ruth: sin cambios.
