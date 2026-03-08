

## Plan: Agregar opcion de crear usuario con contraseña directa

### Cambios

#### 1. Agregar toggle de modo al CreateUserDialog
**Archivo:** `src/components/usuarios/CreateUserDialog.tsx`
- Agregar un Switch para elegir entre "Enviar invitacion" (default) y "Crear con contraseña"
- Campo de contraseña condicional (min 6 chars) cuando se elige modo contraseña
- Cuando es contraseña: llamar a `create-user` edge function, cerrar dialog al exito con toast simple
- Cuando es invitacion: flujo actual sin cambios
- Simplificar validacion: eliminar zod redundante, usar validacion manual simple
- Mover enlace de setup a toast persistente con boton copiar en vez del segundo estado del dialog

#### 2. Actualizar edge function `create-user` para manejar empresa_id
**Archivo:** `supabase/functions/create-user/index.ts`
- Aceptar `empresa_id` en el body
- Pasar `empresa_id` en `user_metadata` para que el trigger `handle_new_user` lo asigne al perfil
- Restringir a solo `administrador` (quitar consultor del check, consistente con pagina Usuarios)

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/usuarios/CreateUserDialog.tsx` | Toggle modo, campo password, toast con enlace, simplificar validacion |
| `supabase/functions/create-user/index.ts` | Aceptar empresa_id, restringir a admin |

