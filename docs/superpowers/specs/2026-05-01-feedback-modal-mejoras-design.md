# Spec: Mejoras al modal de encuesta de clientes

**Fecha:** 2026-05-01  
**Objetivo:** Mejorar la calidad de datos del feedback y la experiencia del usuario al responder la encuesta.

---

## Problema actual

El modal `FeedbackModal.tsx` aparece en el primer inicio de sesión de cualquier usuario, incluyendo usuarios completamente nuevos que no han tenido tiempo de explorar la plataforma. Esto contamina el PMF score (pregunta de retención) y produce respuestas de baja calidad. Además, no existe opción para cerrar o posponer el modal.

---

## Diseño propuesto

### 1. Disparador por sesiones (mínimo 3 logins)

En lugar de mostrar el modal en cualquier sesión, solo se muestra cuando el usuario ha iniciado sesión **3 veces o más**. Esto garantiza que el usuario ya conoce el producto antes de responder.

**Implementación:** Agregar una columna `login_count` (integer, default 0) a la tabla `profiles` en Supabase. En cada login se incrementa el contador vía función o directamente desde el cliente. El modal se muestra cuando `login_count >= 3` y `has_submitted_feedback = false`.

Alternativamente, si no se quiere modificar el schema, usar localStorage con una clave `login_count_v1` que se incrementa en cada sesión.

**Decisión:** Usar localStorage para el contador de sesiones (más rápido de implementar, no requiere migración). La clave `has_submitted_feedback_v1` ya existe; agregar `session_count_v1`.

### 2. Botón "Ahora no, pregúntame en 7 días"

El modal debe tener una opción para posponerlo. Al hacer clic, se guarda en localStorage la fecha actual + 7 días como `feedback_snooze_until`. El modal no vuelve a aparecer hasta que esa fecha haya pasado.

El botón se muestra como texto discreto en el footer izquierdo: `"Ahora no, pregúntame en 7 días"`.

### 3. Actualizar subtítulo del header

Cambiar de "Ayúdanos a mejorar tu experiencia" a texto que comunica que son 5 preguntas:

> **"Tu opinión vale mucho"**  
> 5 preguntas rápidas de tu experiencia real

---

## Lógica de visibilidad del modal

```
login_count_v1 >= 3
  AND has_submitted_feedback_v1 no existe en localStorage
  AND (feedback_snooze_until no existe OR fecha actual > feedback_snooze_until)
→ mostrar modal
```

---

## Archivos afectados

- `src/components/dashboard/FeedbackModal.tsx` — toda la lógica de disparo y el subtítulo del header

---

## Lo que NO cambia

- Las 5 preguntas se mantienen igual (q1–q5)
- El diseño visual del modal (colores, stepper, layout)
- La tabla `feedback_clientes` en Supabase
- `FeedbackResultsCard.tsx` no se toca
