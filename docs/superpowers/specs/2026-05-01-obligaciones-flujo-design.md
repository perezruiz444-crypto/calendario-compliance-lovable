# Diseño: Unificación del flujo de creación de obligaciones

**Fecha:** 2026-05-01  
**Estado:** Aprobado  
**Archivos afectados:** `ObligacionesManager.tsx`, `ObligacionFormDialog.tsx`, `CrearObligacionChooser.tsx` (nuevo)

---

## Contexto

Existen 33 obligaciones "huérfanas" (sin `catalogo_id`) creadas mediante el botón "Nueva" del `ObligacionesManager`. Estas no tienen recurrencia automática porque no pasan por el trigger de BD que activa la generación de ocurrencias. El motor de recurrencia funciona correctamente — el problema es de flujo UX, no de datos ni schema.

Los cambios no tocan BD, no migran datos existentes, y no rompen el flujo de catálogo que ya funciona.

---

## Cambio 1 — `CrearObligacionChooser.tsx` (nuevo)

### Propósito
Interceptar el click en "Nueva" para guiar al usuario hacia el catálogo antes de abrir el form manual.

### Interfaz
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDesdeCatalogo: () => void;
  onPersonalizada: () => void;
}
```

### Comportamiento
- Dialog pequeño con dos opciones:
  - **"Desde el catálogo"** (botón primario) — cierra el chooser, hace scroll a `CatalogoActivacionSection` via `getElementById` o ref
  - **"Personalizada"** (botón secundario outline) — cierra el chooser, abre `ObligacionFormDialog`
- Subtexto bajo cada opción: catálogo = recurrencia automática; personalizada = casos no contemplados en el catálogo

### Cambios en `ObligacionesManager`
- Agregar `const [chooserOpen, setChooserOpen] = useState(false)`
- Botón "Nueva" → `setChooserOpen(true)` (no más `setFormOpen(true)` directo)
- Botón del estado vacío ("Agregar manualmente") → mantiene comportamiento actual (abre form directamente, es un camino secundario ya implícitamente manual)
- Montar `<CrearObligacionChooser>` en el JSX

---

## Cambio 2 — Sugerencia fuzzy en `ObligacionFormDialog`

### Propósito
Cuando el usuario escribe un nombre que coincide con una entrada del catálogo, ofrecerle activar desde catálogo en lugar de continuar con el form manual.

### Carga del catálogo
- `useEffect` al abrir el dialog, solo cuando `!initialData?.id` (creación nueva, no edición)
- Query: `supabase.from('obligaciones_catalogo').select('id, nombre, programa, presentacion').eq('activo', true)`
- Estado: `const [catalogo, setCatalogo] = useState<CatalogoMinItem[]>([])`

### Match en memoria
- `useMemo` que recalcula cuando `form.nombre` cambia
- Condición: `form.nombre.length >= 3`
- Lógica: primer item del catálogo cuyo `nombre.toLowerCase()` incluye `form.nombre.toLowerCase()`
- Estado adicional: `const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false)` — se resetea a `false` cuando el nombre cambia

### UI de la sugerencia
- Se renderiza justo debajo del `Input` de nombre
- Visible cuando: `sugerencia !== null && !sugerenciaDescartada`
- Estilo: contenedor `bg-amber-50 border border-amber-200 rounded-md p-2.5 text-sm` con icono 💡
- Texto: `"[nombre del item]" existe en el catálogo ([programa] · [presentacion])`
- Dos botones inline:
  - **"Activar desde catálogo"** → llama `onSugerirCatalogo(sugerencia)`, el padre cierra el form y abre `ActivarObligacionDialog` con el item preseleccionado
  - **"Continuar personalizada"** → `setSugerenciaDescartada(true)`

### Nueva prop en `ObligacionFormDialog`
```ts
onSugerirCatalogo?: (item: { id: string; nombre: string; programa: string; presentacion: string | null }) => void;
```

### Cambios en `ObligacionesManager`
- Estado: `const [sugerenciaCatalogoItem, setSugerenciaCatalogoItem] = useState<CatalogoMinItem | null>(null)`
- Handler `handleSugerirCatalogo(item)`: cierra el form, guarda el item, abre `ActivarObligacionDialog`
- `ActivarObligacionDialog` ya existe y acepta `item` como prop — se reutiliza sin modificación

---

## Cambio 3 — Badge "Manual" + filtro en `ObligacionesManager`

### Badge en tabla
- En la celda del nombre, después del nombre de la obligación, cuando `!ob.catalogo_id`:
  ```tsx
  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1">Manual</Badge>
  ```
- Discreto: no interrumpe la lectura del nombre

### Estado y lógica del filtro
```ts
const [filterOrigen, setFilterOrigen] = useState<'all' | 'manual' | 'catalogo'>('all');
```

Agregar al bloque `filtered`:
```ts
if (filterOrigen === 'manual' && ob.catalogo_id) return false;
if (filterOrigen === 'catalogo' && !ob.catalogo_id) return false;
```

### UI del filtro
- Nuevo `Select` pequeño junto a los otros filtros:
  - Opciones: "Todos", "Solo manuales", "Solo catálogo"
  - Ícono: `BookOpen` o `Filter`

### Contador en header
```ts
const huerfanasCount = obligaciones.filter(ob => !ob.catalogo_id).length;
```
- Se muestra solo cuando `huerfanasCount >= 3`
- Badge clickeable junto a los badges de "vencidos" y "próximos":
  ```tsx
  <Badge
    className="bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 gap-1"
    title="Obligaciones sin vínculo al catálogo maestro"
    onClick={() => setFilterOrigen('manual')}
  >
    {huerfanasCount} manuales · revisar
  </Badge>
  ```

---

## Criterios de éxito

1. Click en "Nueva" muestra el dialog chooser con 2 opciones claras antes de abrir cualquier form
2. Escribir "INEGI" (o cualquier nombre de 3+ chars que coincida) en el form manual muestra el banner amber con la sugerencia
3. Las obligaciones sin `catalogo_id` muestran badge "Manual" en la tabla
4. Si hay ≥3 manuales, aparece el contador en el header; al hacer click aplica el filtro "Solo manuales"
5. Crear una obligación desde catálogo sigue funcionando igual sin regresiones

## Lo que NO cambia

- Schema BD: sin migraciones
- `CatalogoActivacionSection` y `ActivarObligacionDialog`: sin modificaciones
- Flujo de edición de obligaciones existentes: sin cambios
- No se fuerza migración de obligaciones huérfanas existentes
