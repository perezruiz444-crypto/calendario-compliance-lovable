

## Plan: Mejoras al Portal de Cumplimiento de Obligaciones — Fase 1

Implementar las mejoras más impactantes y viables para elevar la experiencia del cliente.

### 1. Historial de cumplimiento por obligación
**Archivo**: `src/pages/MiEmpresa.tsx`
- Agregar un botón/ícono "Ver historial" en cada obligación que abra un pequeño popover o dialog mostrando los últimos 6-12 periodos con estado ✅/❌ en formato de grid compacto (tipo heatmap simplificado).
- Consulta a `obligacion_cumplimientos` filtrando por `obligacion_id` y mostrando todos los `periodo_key` ordenados.

### 2. Filtros en la lista de obligaciones del cliente
**Archivo**: `src/pages/MiEmpresa.tsx`
- Agregar barra de filtros encima de la lista: estado (pendiente/cumplida), categoría, y un campo de búsqueda por nombre.
- Implementar con estado local `useState` para filtros, aplicados sobre el array `obligaciones` antes del render.

### 3. Responsable visible por obligación
**Archivos**: `src/pages/MiEmpresa.tsx`, `src/components/empresas/EmpresaObligacionesActivasCard.tsx`
- Hacer join con `profiles` usando `responsable_id` al consultar obligaciones.
- Mostrar un pequeño avatar/nombre del responsable junto a cada obligación.
- Diferenciar visualmente "Consultor" vs "Cliente/Empresa" con un badge.

### 4. Adjuntar evidencia al marcar cumplimiento
**Archivos**: `src/pages/MiEmpresa.tsx` (nuevo componente `EvidenciaCumplimiento`)
- Al marcar checkbox de cumplimiento, mostrar un mini-dialog opcional para subir archivo PDF/imagen como evidencia.
- Agregar columna `evidencia_url` a la tabla `obligacion_cumplimientos` (migración SQL).
- Subir archivo a Supabase Storage bucket `evidencias-cumplimiento`.

### 5. Exportar reporte de cumplimiento a PDF
**Archivo**: Nuevo `src/components/obligaciones/ExportarCumplimientoButton.tsx`
- Botón "Exportar Reporte" en la pestaña de obligaciones.
- Usar `jspdf` (ya instalado) para generar PDF con tabla de todas las obligaciones, su estado, periodo, categoría y fecha de vencimiento.
- Incluir logo/nombre de empresa y fecha de generación.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/MiEmpresa.tsx` | Filtros, historial, responsable, botón exportar |
| `src/components/empresas/EmpresaObligacionesActivasCard.tsx` | Responsable visible |
| Nuevo: `src/components/obligaciones/CumplimientoHistorial.tsx` | Dialog de historial por obligación |
| Nuevo: `src/components/obligaciones/ExportarCumplimientoButton.tsx` | Generación de PDF |
| Nuevo: `src/components/obligaciones/EvidenciaCumplimiento.tsx` | Upload de evidencia |
| Migración SQL | Agregar `evidencia_url` a `obligacion_cumplimientos` |

### Orden de implementación sugerido
1. Filtros y búsqueda (impacto inmediato, sin cambios DB)
2. Responsable visible (join simple)
3. Historial de cumplimiento (consulta existente)
4. Exportar PDF (usa librería existente)
5. Evidencia de cumplimiento (requiere migración + storage)

