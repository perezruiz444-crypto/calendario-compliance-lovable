

# Plan: Encuesta Customer Discovery — Obligatoria para Clientes

## Resumen
Modal de encuesta atractivo que aparece al login para clientes, obligatorio (no se puede cerrar sin contestar), respuestas visibles solo para admin en el Dashboard.

## Paso 1: Migración SQL
Crear tabla `feedback_clientes` con RLS:
- INSERT: usuarios autenticados donde `auth.uid() = user_id`
- SELECT: solo administradores vía `has_role()`

```sql
CREATE TABLE public.feedback_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  q1_razon_login text NOT NULL,
  q2_semaforo_rating integer NOT NULL CHECK (q2_semaforo_rating BETWEEN 1 AND 5),
  q3_friccion text,
  q4_varita_magica text,
  q5_retencion text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## Paso 2: Componente `FeedbackModal.tsx`
- Dialog de shadcn/ui **sin botón de cerrar** (modal obligatorio, no dismissible)
- Copy del header: "Ayúdanos a mejorar tu experiencia" + "Solo te tomará 1-2 minutos"
- Diseño premium con gradiente navy, iconos y stepper de progreso (5 pasos)
- Usa las fuentes ya existentes del proyecto (Fraunces para títulos, DM Sans body)
- Las 5 preguntas del brief con RadioGroup (Q1, Q5), Slider (Q2), Textarea (Q3, Q4)
- Botón "Enviar Mis Respuestas" con loading state
- Al enviar: INSERT en Supabase, toast de agradecimiento, guardar `has_submitted_feedback_v1` en localStorage
- **No se puede cerrar sin enviar** — `onInteractOutside` y escape deshabilitados

## Paso 3: Integración en `Dashboard.tsx`
- Renderizar `<FeedbackModal />` solo si `role === 'cliente'`
- El modal checa localStorage; si ya respondió, no se muestra
- También checa en Supabase (por si cambió de navegador)

## Paso 4: Panel de respuestas para Admin
- Nuevo componente `FeedbackResultsCard.tsx` en el Dashboard admin
- Card con tabla resumen de respuestas: fecha, usuario, razón login, rating, retención
- Click en fila expande detalle completo (Q3, Q4)
- Se renderiza en `Dashboard.tsx` solo cuando `role === 'administrador'`

## Archivos a crear/modificar
1. **Crear** migración SQL (tabla + RLS)
2. **Crear** `src/components/dashboard/FeedbackModal.tsx`
3. **Crear** `src/components/dashboard/FeedbackResultsCard.tsx`
4. **Editar** `src/pages/Dashboard.tsx` — importar ambos componentes condicionalmente
5. **Editar** `src/integrations/supabase/types.ts` — agregar tipo de la nueva tabla

