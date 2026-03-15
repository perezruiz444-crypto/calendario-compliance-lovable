

# Plan: Arreglar mensajería y agregar notificación por correo

## Problema 1: Mensajes no cargan (Error PGRST200)

La tabla `mensajes` no tiene foreign keys hacia `profiles`, pero las queries en `Mensajes.tsx` y `MensajeDetailDialog.tsx` usan hints como `profiles!mensajes_remitente_id_fkey`. Esto causa el error "Could not find a relationship".

**Solución — Migración SQL:**
```sql
ALTER TABLE public.mensajes
  ADD CONSTRAINT mensajes_remitente_id_fkey
    FOREIGN KEY (remitente_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT mensajes_destinatario_id_fkey
    FOREIGN KEY (destinatario_id) REFERENCES public.profiles(id);
```

## Problema 2: Cliente no puede ver destinatarios

La RLS de `profiles` solo permite `SELECT` donde `auth.uid() = id`. Los clientes no pueden ver otros perfiles para seleccionarlos como destinatarios.

**Solución — Nueva política RLS en `profiles`:**
Permitir que usuarios autenticados vean `id` y `nombre_completo` de todos los perfiles. Como la query del dropdown solo pide `id, nombre_completo`, esto es seguro.

```sql
CREATE POLICY "Authenticated users can view all profiles basic info"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
```

Esto reemplaza la política restrictiva actual. Alternativamente, se puede crear una vista, pero dado que `profiles` no tiene datos sensibles (no hay passwords ni API keys), una política SELECT más amplia es razonable.

## Problema 3: No se envía correo al recibir un mensaje

Actualmente el trigger `notify_new_mensaje` solo inserta en `notificaciones` (in-app). No hay lógica para enviar email.

**Solución:**
1. Crear una Edge Function `send-message-notification` que:
   - Reciba `mensaje_id`
   - Consulte el mensaje, remitente y destinatario (email + nombre)
   - Use la función SMTP compartida para enviar un correo con la plantilla simplificada
2. Agregar una plantilla `newMessageTemplate` en `email-templates.ts` con el estilo minimalista existente
3. Invocar la Edge Function desde `CreateMensajeDialog.tsx` después de insertar el mensaje exitosamente
4. Registrar en `supabase/config.toml` con `verify_jwt = false`

### Plantilla de correo
Estilo consistente con las demás: texto plano, tabla simple mostrando remitente, asunto y extracto del contenido.

### Cambios en archivos

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Agregar FKs + política RLS |
| `_shared/email-templates.ts` | Agregar `newMessageTemplate()` |
| `supabase/functions/send-message-notification/index.ts` | Nueva Edge Function |
| `supabase/config.toml` | Registrar nueva función |
| `src/components/mensajes/CreateMensajeDialog.tsx` | Invocar Edge Function post-envío |

