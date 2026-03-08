

## Plan: Apariencia solo para Admin, visible para todos los usuarios

### Problema actual
- La sección "Colores" está visible para todos los roles
- El tema se guarda en `localStorage` del navegador de cada usuario (cada quien ve su propio tema)
- El admin debería ser el único que controla la apariencia, y los cambios deben aplicarse a todos

### Cambios

#### 1. Crear tabla `app_settings` en Supabase
- Tabla con columna `key` (text, unique) y `value` (jsonb)
- Insertar un registro `key = 'theme_colors'` con el JSON de colores
- RLS: SELECT para todos los autenticados, UPDATE/INSERT solo para administradores (usando `has_role`)

#### 2. Marcar "Colores" como `adminOnly` en Configuraciones
**Archivo:** `src/pages/Configuraciones.tsx`
- Agregar `adminOnly: true` a la sección `colores`
- Los consultores y clientes ya no ven esa sección

#### 3. Cambiar ThemeEditor para guardar en DB en vez de localStorage
**Archivo:** `src/components/configuraciones/ThemeEditor.tsx`
- `handleSave` → hace upsert a `app_settings` donde `key = 'theme_colors'`
- `handleReset` → borra el registro o lo pone en defaults
- Eliminar el uso de `localStorage` para el tema

#### 4. Cambiar `initThemeFromStorage` para cargar desde DB
**Archivo:** `src/main.tsx` y `src/components/configuraciones/ThemeEditor.tsx`
- Al iniciar la app, hacer un query a `app_settings` para obtener los colores del tema
- Si no hay registro, usar los defaults del CSS
- Aplicar los colores al `document.documentElement` como ya se hace

#### 5. Quitar dark mode toggle de "General" (solo admin)
- El toggle de "Modo oscuro" en la sección General también debería ser controlado por admin, o mantenerse como preferencia personal. Se mantiene como preferencia personal ya que es independiente de la paleta de colores.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Migración SQL | Crear tabla `app_settings` con RLS |
| `src/pages/Configuraciones.tsx` | Marcar sección "colores" como `adminOnly: true` |
| `src/components/configuraciones/ThemeEditor.tsx` | Guardar/cargar tema desde `app_settings` en vez de localStorage |
| `src/main.tsx` | Cargar tema desde Supabase al iniciar |

