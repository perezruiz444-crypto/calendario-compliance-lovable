

# Plan: Simplificar el Sistema - Menos Menús y Edición Directa

## Objetivo
Hacer el sistema más limpio, eficiente y fácil de usar, reduciendo la cantidad de clics necesarios para acciones comunes como editar empresas.

---

## Problemas Identificados

| Problema | Impacto |
|----------|---------|
| 3 clics para editar empresa (Menú → Empresa → Editar) | Ineficiente |
| Selector de empresa duplicado (sidebar + dashboard) | Redundancia visual |
| 8 pestañas en diálogo de edición | Abrumador |
| Vistas separadas para ver y editar información | Navegación confusa |

---

## Soluciones Propuestas

### 1. Edición Inline en Página de Detalle de Empresa

**Cambio**: En lugar de abrir un diálogo separado para editar, convertir la página de detalle de empresa en una vista editable directamente.

**Antes**: Ver información → Clic en "Editar" → Diálogo con 8 pestañas → Guardar → Cerrar diálogo

**Después**: Ver información con botones de edición inline en cada sección → Editar directamente → Guardar automático o con botón

**Beneficios**:
- Elimina el diálogo modal gigante
- Permite editar secciones específicas sin navegar
- Contexto visual siempre visible

---

### 2. Acceso Rápido desde Lista de Empresas

**Cambio**: Agregar botón de "Editar" directamente en la lista de empresas (página `/empresas`) para no tener que entrar a la página de detalle.

```
┌─────────────────────────────────────────────────────┐
│ Empresa XYZ                                         │
│ RFC: ABC123456789 • Tel: 555-1234                   │
│                                                     │
│ [Consultores] [Editar ✏️] [Ver Detalles →]         │
└─────────────────────────────────────────────────────┘
```

---

### 3. Consolidar Selector de Empresa

**Cambio**: Mantener el selector SOLO en el sidebar y eliminar la tarjeta duplicada del Dashboard.

**Antes**:
- Selector en sidebar (siempre visible)
- Tarjeta "Empresa Seleccionada" en Dashboard (ocupa espacio)

**Después**:
- Solo selector en sidebar
- Dashboard más limpio con solo métricas importantes

---

### 4. Simplificar Menú Lateral (Opcional)

**Evaluación de elementos del menú**:

| Menú | ¿Necesario? | Propuesta |
|------|-------------|-----------|
| Dashboard | Sí | Mantener |
| Empresas | Sí | Mantener |
| Tareas | Sí | Mantener |
| Calendario | ¿Duplica tareas? | Mantener (vista diferente) |
| Mensajes | Sí | Mantener |
| Reportes | Sí | Mantener |
| Usuarios | Sí | Mantener (solo admin) |
| Configuraciones | ¿Muy vacío? | Evaluar mover a dropdown de perfil |

**Recomendación**: Mover "Configuraciones" a un menú dentro del área de perfil del usuario en la parte inferior del sidebar, ya que tiene pocas opciones.

---

## Cambios Técnicos

### Archivo 1: `src/pages/Empresas.tsx`
- Agregar botón "Editar" en cada tarjeta de empresa
- El botón abre el Sheet/Dialog de edición directamente desde la lista

### Archivo 2: `src/pages/EmpresaDetail.tsx`
- Convertir las tarjetas de información en componentes editables inline
- Agregar botón "Editar" pequeño (ícono de lápiz) en cada Card
- Al hacer clic, los campos se vuelven editables dentro del mismo Card
- Agregar botón "Guardar" cuando hay cambios pendientes

### Archivo 3: `src/pages/Dashboard.tsx`
- Eliminar la Card "Empresa Seleccionada" que duplica el selector del sidebar
- Reorganizar el espacio para mostrar información más útil

### Archivo 4: `src/components/layout/DashboardLayout.tsx`
- Mover "Configuraciones" al área de perfil de usuario (dropdown o botón junto a "Cerrar Sesión")
- Mantener el sidebar más limpio

### Archivo 5: Nuevo componente `src/components/empresas/EditableCard.tsx`
- Componente reutilizable que muestra información pero permite edición inline
- Toggle entre modo vista y modo edición
- Guardado automático o con confirmación

---

## Mockup: Nueva Experiencia de Edición

```text
┌────────────────────────────────────────────────────────────────┐
│ ← Volver    EMPRESA XYZ S.A. de C.V.                           │
│             RFC: ABC123456789 • Tel: 555-1234                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Información General                              [✏️]   │  │
│  │                                                          │  │
│  │ Razón Social: _________________ [Campo editable]        │  │
│  │ RFC: __________________________ [Campo editable]        │  │
│  │ Teléfono: _____________________ [Campo editable]        │  │
│  │                                                          │  │
│  │ [Cambios sin guardar]                    [Guardar] [×]  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Programa IMMEX                                   [✏️]   │  │
│  │                                                          │  │
│  │ Número: IMMEX-12345                                      │  │
│  │ Modalidad: Industrial                                    │  │
│  │ Fecha Autorización: 15/03/2020                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Resumen de Simplificaciones

| Área | Antes | Después |
|------|-------|---------|
| Editar empresa | 3 clics + diálogo | 1-2 clics inline |
| Selector empresa | Duplicado (sidebar + dashboard) | Solo en sidebar |
| Menú Config | Item separado | Integrado en perfil |
| Diálogo 8 pestañas | Modal grande | Secciones colapsables inline |

---

## Orden de Implementación

1. **Agregar botón "Editar" en lista de empresas** (rápido, alto impacto)
2. **Eliminar selector duplicado del Dashboard** (rápido, limpieza visual)
3. **Mover Configuraciones al área de perfil** (medio, simplifica menú)
4. **Implementar edición inline en página de detalle** (más complejo, mejor UX)

---

## Notas Técnicas

- La edición inline usa el mismo estado de formulario pero renderizado dentro de las Cards existentes
- Se mantiene el diálogo como fallback o para edición masiva
- Los cambios son retrocompatibles - no se pierde funcionalidad
- Se puede implementar por fases

