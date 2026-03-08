

## Plan: Rediseño del portal de empresa

### Problema actual
La pagina `EmpresaDetail.tsx` tiene un layout plano con muchas tarjetas apiladas, un header basico, y stats cards genéricas. La edicion requiere entrar a cada tarjeta individual. Se ve funcional pero no atractivo ni intuitivo.

### Cambios propuestos

#### 1. Header hero con informacion clave y acciones rapidas
Reemplazar el header actual (titulo + RFC badge + boton consultores) con un hero compacto que incluya:
- Icono/avatar de la empresa con las iniciales
- Razon social grande, RFC, actividad economica, telefono
- Boton de edicion rapida inline del nombre/RFC/telefono directamente en el header
- Acciones: Consultores, Nueva Tarea, agrupadas con dropdown si hay mas

#### 2. Tabs para organizar el contenido
En vez de mostrar TODO en una pagina larga con scroll, usar `Tabs` (ya disponible en el proyecto):
- **Resumen**: Stats + Obligaciones + Tareas recientes (lo mas importante arriba)
- **Información**: General, IMMEX, PROSEC, Certificacion (las 4 cards actuales)
- **Contactos**: Agentes Aduanales, Apoderados, Domicilios
- **Obligaciones**: El `ObligacionesManager` completo

#### 3. Stats cards mejoradas
Rediseñar las 3 stats cards con iconos, colores de fondo suaves y mejor tipografia. Agregar un 4to stat: "Obligaciones proximas a vencer".

#### 4. Edicion rapida desde el header
Hacer el nombre de la empresa, RFC y telefono editables directamente con click (sin necesidad de ir a la tarjeta de informacion general). Un click en el campo lo convierte en input, Enter guarda, Escape cancela.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/EmpresaDetail.tsx` | Rediseño completo: hero header, tabs, stats mejorados, edicion inline en header |

No se necesitan cambios de base de datos.

### Detalles tecnicos
- Usar `Tabs` de `@radix-ui/react-tabs` (ya instalado)
- Mantener todos los componentes hijo existentes (`EmpresaGeneralCard`, etc.) sin modificar
- La edicion inline del header usa un patron simple: estado `editingField` + click handler + `Input` que aparece condicionalmente
- Las stats se enriquecen con un query adicional para contar obligaciones con vencimiento <= 90 dias

