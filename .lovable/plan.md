

## Plan: Corregir permisos, accesos y completar mejoras pendientes

### Cambios

#### 1. Configuraciones accesible para todos los roles en el sidebar
**Archivo:** `src/components/layout/DashboardLayout.tsx`
- Mover "Configuraciones" del footer del sidebar a la lista principal de navegación (`navItems`), visible para los 3 roles
- Eliminar el bloque condicional `{role === 'administrador' && ...}` del footer
- Las secciones admin-only dentro de Configuraciones ya están protegidas con `adminOnly`

#### 2. Proteger ruta Reportes: solo admin y consultor
**Archivo:** `src/pages/Reportes.tsx`
- Agregar redirect al dashboard si el rol no es `administrador` ni `consultor` (similar a como ya se hace en Empresas.tsx)

#### 3. Proteger ruta Usuarios: solo admin
**Archivo:** `src/pages/Usuarios.tsx`
- Cambiar la verificación en línea 66 de `role !== 'administrador' && role !== 'consultor'` a `role !== 'administrador'`
- Cambiar la condición en línea 69 para solo ejecutar `fetchUsuarios` cuando es admin

#### 4. Redirect clientes en EmpresaDetail
**Archivo:** `src/pages/EmpresaDetail.tsx`
- Si el rol es `cliente` y navega a `/empresas/:id`, redirigir a `/mi-empresa` con un toast informativo

#### 5. Completar delete cascade en Empresas
**Archivo:** `src/pages/Empresas.tsx`
- Agregar las tablas faltantes al `handleDeleteEmpresa`: `solicitudes_servicio`, `client_invitations`, `obligacion_cumplimientos` (este último requiere borrar primero los cumplimientos de las obligaciones de esa empresa)

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/layout/DashboardLayout.tsx` | Configuraciones en nav principal para todos |
| `src/pages/Reportes.tsx` | Redirect si no es admin/consultor |
| `src/pages/Usuarios.tsx` | Restringir a solo admin |
| `src/pages/EmpresaDetail.tsx` | Redirect clientes a /mi-empresa |
| `src/pages/Empresas.tsx` | Completar delete cascade |

