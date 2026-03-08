

## Plan: Simplificar y dinamizar los flujos de creacion y edicion

### Problemas identificados

1. **EditEmpresaDialog tiene 8 tabs en un modal** -- Es abrumador. El usuario tiene que navegar por General, IMMEX, PROSEC, Certificacion, Apoderados, Agentes, Matriz, Padron dentro de un dialogo. Es mas natural editar inline desde la vista de detalle (que ya existe parcialmente con `EmpresaGeneralCard`).

2. **CreateEmpresaDialog es un modal pesado** -- Solo pide datos basicos pero podria ser mas agil, tipo el patron QuickCreate que ya existe para tareas.

3. **La lista de empresas es plana** -- Solo muestra razon social, RFC y domicilio. No tiene busqueda, filtros ni indicadores de estado (IMMEX activo, certificacion vigente, etc.).

4. **CreateTareaDialog tiene 759 lineas** -- Es un componente monolitico con tabs, recurrencia, draft, preview, attachments. Funciona pero es pesado.

5. **ObligacionFormDialog usa N+1 queries** -- Hace queries individuales por cada consultor/cliente para verificar roles.

6. **EmpresaDetail no permite editar agentes/apoderados/domicilios inline** -- Solo los muestra como listados de solo lectura.

### Cambios propuestos

#### 1. Eliminar EditEmpresaDialog y potenciar la edicion inline en EmpresaDetail
**Archivos:** `src/pages/EmpresaDetail.tsx`, `src/pages/Empresas.tsx`

- Eliminar el boton "Editar" de la lista de empresas que abre el dialog de 8 tabs
- Los datos ya se editan inline en EmpresaDetail con las cards (GeneralCard, IMMEXCard, etc.)
- Agregar edicion inline a **Agentes Aduanales**, **Apoderados Legales** y **Domicilios de Operacion** directamente en EmpresaDetail (agregar/editar/eliminar sin salir de la pagina)

#### 2. Crear empresas con Quick Create
**Archivo:** `src/components/empresas/QuickCreateEmpresa.tsx`

- Dialogo compacto con solo 3 campos: Razon Social, RFC, Domicilio Fiscal
- Opcion "Crear otra" como en QuickCreateTarea
- Al crear, redirigir a la vista de detalle donde se puede completar el resto de la info inline

#### 3. Mejorar la lista de empresas
**Archivo:** `src/pages/Empresas.tsx`

- Agregar barra de busqueda por razon social o RFC
- Agregar badges de estado: tiene IMMEX, tiene certificacion, etc.
- Simplificar botones de accion (dropdown con opciones en vez de 4 botones visibles)
- Agregar contador de obligaciones/tareas pendientes por empresa

#### 4. Hacer las cards de agentes/apoderados/domicilios editables
**Archivos nuevos:**
- `src/components/empresas/AgentesAduanalesCard.tsx` -- Card con lista editable (agregar, editar inline, eliminar con confirmacion)
- `src/components/empresas/ApoderadosCard.tsx` -- Mismo patron
- `src/components/empresas/DomiciliosCard.tsx` -- Mismo patron

Cada card sigue el patron de `EditableCard` existente: modo vista / modo edicion con botones Check/X.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/empresas/QuickCreateEmpresa.tsx` | Nuevo: dialogo compacto para crear empresas rapido |
| `src/pages/Empresas.tsx` | Busqueda, badges de estado, dropdown de acciones, eliminar boton Editar modal |
| `src/pages/EmpresaDetail.tsx` | Integrar cards editables para agentes, apoderados y domicilios |
| `src/components/empresas/AgentesAduanalesCard.tsx` | Nuevo: card con CRUD inline para agentes |
| `src/components/empresas/ApoderadosCard.tsx` | Nuevo: card con CRUD inline para apoderados |
| `src/components/empresas/DomiciliosCard.tsx` | Nuevo: card con CRUD inline para domicilios |

### Lo que NO cambia (ya funciona bien)
- Las cards inline existentes (GeneralCard, IMMEXCard, PROSECCard, CertificacionCard)
- QuickCreateTarea y CreateTareaDialog (ya son funcionales)
- ObligacionFormDialog (funcional, optimizacion de queries es secundaria)
- El EditEmpresaDialog no se elimina del proyecto pero se deja de usar desde Empresas.tsx

