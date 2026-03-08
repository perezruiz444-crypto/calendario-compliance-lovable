

## Plan: Rediseñar Configuraciones con navegacion lateral y mejor UX

### Problema actual
La pagina usa tabs horizontales que se ven planos, esconden el texto en mobile, y no dan sensacion de "app de configuraciones". Es un layout poco dinamico para la cantidad de secciones que tiene.

### Cambios

**Archivo:** `src/pages/Configuraciones.tsx` - Rediseño completo del layout

Reemplazar los Tabs horizontales por un layout de **dos columnas** estilo "Settings" moderno:

- **Columna izquierda (sidebar de configuraciones)**: Lista de secciones con iconos, nombre y descripcion corta. El item activo se resalta visualmente. En mobile se convierte en un menu desplegable o accordion.
- **Columna derecha (contenido)**: Muestra el contenido de la seccion seleccionada con transicion suave.
- **Header mejorado**: Agregar un buscador rapido que filtra las secciones visibles.
- **Cards interactivas**: Las cards de "General" se rediseñan con hover effects, iconos mas prominentes y un mejor uso del espacio.
- **Indicadores visuales**: Badge "Admin" junto a las secciones que solo ve el administrador. Conteo de notificaciones activas/inactivas como badge en la seccion de notificaciones.

### Estructura visual

```text
┌──────────────────────────────────────────────┐
│  ⚙ Configuraciones                          │
│  Personaliza tu experiencia                  │
├──────────────┬───────────────────────────────┤
│              │                               │
│  🔍 Buscar   │   [Contenido de la seccion    │
│              │    seleccionada]               │
│  ● General   │                               │
│  🎨 Colores  │   Cards con hover effects,    │
│  🔔 Notif.   │   switches animados,          │
│  ⏰ Record.  │   previsualización en vivo    │
│  📜 Historial│                               │
│              │                               │
└──────────────┴───────────────────────────────┘
```

En mobile (< 768px), la columna izquierda se convierte en un select dropdown o un menu horizontal scrollable arriba.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Configuraciones.tsx` | Rediseño completo: layout dos columnas, sidebar de secciones, busqueda, badges admin, responsive |

