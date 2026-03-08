

## Plan: Mejorar el selector de empresas del sidebar

### Problema actual
El selector usa un Popover+Command genérico que se siente pesado en el sidebar. Además, muestra un badge redundante debajo repitiendo el nombre de la empresa seleccionada.

### Cambios

**Archivo:** `src/components/empresas/EmpresaSelectorDropdown.tsx`

Rediseño visual completo:
- Reemplazar el botón outline genérico por un componente más compacto y elegante con el nombre de la empresa como texto principal y un subtítulo "Empresa activa"
- Agregar el **conteo de empresas** disponibles (ej: "3 empresas")
- Agregar un **avatar/iniciales** de la empresa seleccionada con color generado por hash del nombre
- Incluir un **indicador visual** (punto verde) de empresa activa
- Usar `ScrollArea` en el listado para manejar muchas empresas sin overflow
- Agregar separador visual entre "Todas las empresas" y el listado individual
- Mostrar las iniciales de cada empresa en el listado del dropdown

**Archivo:** `src/components/layout/DashboardLayout.tsx`

- Eliminar el badge redundante que muestra `consultorEmpresaInfo.razon_social` debajo del selector (ya se ve en el selector mismo)
- Eliminar el badge "Vista consolidada" (se integrará dentro del selector)
- Limpiar el bloque del sidebar para que el selector sea autosuficiente

### Resultado
Un selector más compacto, visualmente rico, sin información duplicada, que se siente integrado en el sidebar como un componente de primera clase.

