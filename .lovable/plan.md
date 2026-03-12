

## Plan: 3 Mejoras — Eliminar Theme Editor, Filtrar por Empresa Global, Excel de Obligaciones

### 1. Eliminar configuración de colores/tema

El theme editor no funciona correctamente y el usuario quiere dejarlo en tema claro permanente.

**Cambios:**
- **`src/main.tsx`**: Eliminar la llamada a `initThemeFromStorage()`
- **`src/App.tsx`**: En `ThemeProvider`, forzar `defaultTheme="light"` y quitar toggle de dark mode
- **`src/pages/Configuraciones.tsx`**: 
  - Eliminar la sección "colores" del array `sections`
  - Eliminar el switch de "Modo oscuro" de la sección "General"
  - Eliminar imports de `ThemeEditor`, `ColorPreviewMini`, `useTheme`
- **`src/components/configuraciones/ThemeEditor.tsx`**: Se puede conservar el archivo pero ya no se importa
- Limpiar cualquier inline style residual del `document.documentElement` que haya quedado de temas anteriores (reset en el init)

### 2. Empresa selector filtra datos globalmente

**Problema**: El selector de empresa en el sidebar guarda en `localStorage` pero ninguna página lo lee. Dashboard, Tareas, Calendario, etc. no filtran por la empresa seleccionada.

**Solución**: Crear un React Context (`EmpresaContext`) que exponga `selectedEmpresaId` globalmente, y hacer que las páginas lo consuman para filtrar sus queries.

**Archivos:**
- **Nuevo `src/hooks/useEmpresaContext.tsx`**: Context + Provider con estado sincronizado a localStorage. Emite `selectedEmpresaId` y `setSelectedEmpresaId`.
- **`src/App.tsx`**: Envolver con `EmpresaProvider`
- **`src/components/layout/DashboardLayout.tsx`**: Usar el context en vez de estado local
- **`src/components/empresas/EmpresaSelectorDropdown.tsx`**: Conectar al context
- **`src/hooks/useAnalytics.tsx`**: Recibir `empresaId` y filtrar queries (tareas, etc.) cuando no es "all"
- **`src/pages/Dashboard.tsx`**: Pasar `selectedEmpresaId` del context al hook de analytics
- **`src/pages/Tareas.tsx`**: Filtrar tareas por empresa seleccionada
- **`src/pages/Calendario.tsx`**: Filtrar eventos por empresa seleccionada
- **`src/pages/Mensajes.tsx`**: Filtrar por empresa si aplica

### 3. Reporte Excel de obligaciones

Agregar botón de descarga Excel en `ObligacionesManager` que exporte las obligaciones con su estado de cumplimiento.

**Archivos:**
- **`src/components/obligaciones/ObligacionesManager.tsx`**: Agregar botón "Descargar Excel" junto al botón de PDF existente. Usar la librería `xlsx` (ya instalada) para generar un workbook con columnas: Categoría, Nombre, Artículos, Presentación, Estado, Vencimiento, Cumplida (Sí/No), Periodo.

**Columnas del Excel:**
- Categoría, Nombre, Artículos, Presentación, Período, Vencimiento, Estado (Vigente/Vencido), Cumplida (Sí/No del periodo actual)

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/hooks/useEmpresaContext.tsx` | Nuevo — Context para empresa seleccionada |
| `src/App.tsx` | Envolver con EmpresaProvider, forzar tema claro |
| `src/main.tsx` | Eliminar initThemeFromStorage |
| `src/components/layout/DashboardLayout.tsx` | Usar context en vez de estado local |
| `src/components/empresas/EmpresaSelectorDropdown.tsx` | Conectar al context |
| `src/pages/Configuraciones.tsx` | Eliminar sección colores y modo oscuro |
| `src/hooks/useAnalytics.tsx` | Aceptar empresaId para filtrar |
| `src/pages/Dashboard.tsx` | Pasar empresaId del context |
| `src/pages/Tareas.tsx` | Filtrar por empresa del context |
| `src/pages/Calendario.tsx` | Filtrar por empresa del context |
| `src/components/obligaciones/ObligacionesManager.tsx` | Agregar botón Excel con xlsx |

No se necesita migración de base de datos.

