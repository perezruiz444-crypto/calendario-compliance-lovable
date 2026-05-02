# Feedback Modal — Mejoras de disparo y UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar la encuesta de clientes solo tras 3+ sesiones y agregar opción de posponerla 7 días.

**Architecture:** Solo se modifica `FeedbackModal.tsx`. Toda la lógica de visibilidad vive en el `useEffect` de ese componente usando tres claves de localStorage: `has_submitted_feedback_v1` (ya existe), `session_count_v1` (nueva) y `feedback_snooze_until` (nueva). Sin cambios en Supabase ni en otros archivos.

**Tech Stack:** React, TypeScript, localStorage API.

---

### Task 1: Incrementar contador de sesiones en localStorage

**Files:**
- Modify: `src/components/dashboard/FeedbackModal.tsx:40-57`

- [ ] **Step 1: Agregar constantes para las nuevas claves de localStorage**

En `FeedbackModal.tsx`, después de la línea:
```ts
const STORAGE_KEY = 'has_submitted_feedback_v1';
```

Agregar:
```ts
const SESSION_COUNT_KEY = 'session_count_v1';
const SNOOZE_KEY = 'feedback_snooze_until';
const MIN_SESSIONS = 3;
```

- [ ] **Step 2: Incrementar el contador al montar el componente**

Reemplazar el `useEffect` completo (líneas 40–57) por:

```ts
useEffect(() => {
  const checkIfShouldShow = () => {
    // Ya respondió — nunca mostrar
    if (localStorage.getItem(STORAGE_KEY)) {
      setChecking(false);
      return;
    }

    // Incrementar contador de sesiones
    const currentCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
    const newCount = currentCount + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(newCount));

    // Aún no tiene suficientes sesiones
    if (newCount < MIN_SESSIONS) {
      setChecking(false);
      return;
    }

    // Verificar si está en modo snooze
    const snoozeUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozeUntil && Date.now() < parseInt(snoozeUntil, 10)) {
      setChecking(false);
      return;
    }

    setChecking(false);
    setOpen(true);
  };

  checkIfShouldShow();
}, [userId]);
```

- [ ] **Step 3: Verificar en el navegador que el modal NO aparece en las primeras 2 sesiones**

Abrir DevTools → Application → Local Storage → verificar que `session_count_v1` incremente cada vez que se monta el componente. El modal no debe aparecer hasta que el valor llegue a 3.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/FeedbackModal.tsx
git commit -m "feat(feedback): mostrar encuesta solo tras 3+ sesiones"
```

---

### Task 2: Agregar botón "Ahora no, pregúntame en 7 días"

**Files:**
- Modify: `src/components/dashboard/FeedbackModal.tsx:272-314`

- [ ] **Step 1: Crear función handleSnooze**

Dentro del componente, antes del `return`, agregar:

```ts
const handleSnooze = () => {
  const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, String(sevenDaysFromNow));
  setOpen(false);
};
```

- [ ] **Step 2: Agregar el botón en el footer de navegación**

Reemplazar el bloque `{/* Navigation buttons */}` completo (líneas 273–314) por:

```tsx
{/* Navigation buttons */}
<div className="px-6 pb-5 flex flex-col gap-2">
  <div className="flex items-center justify-between gap-3">
    {step > 0 ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStep(step - 1)}
        className="gap-1.5 font-heading"
      >
        <ChevronLeft className="w-4 h-4" /> Anterior
      </Button>
    ) : (
      <div />
    )}

    {step < 4 ? (
      <Button
        size="sm"
        onClick={() => setStep(step + 1)}
        disabled={!canProceed()}
        className="gap-1.5 font-heading"
      >
        Siguiente <ChevronRight className="w-4 h-4" />
      </Button>
    ) : (
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={!canProceed() || loading}
        className="gap-1.5 font-heading bg-gradient-to-r from-primary to-[hsl(210,100%,30%)]"
      >
        {loading ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" /> Enviando...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Enviar Mis Respuestas
          </>
        )}
      </Button>
    )}
  </div>

  <button
    onClick={handleSnooze}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 text-center font-body py-1"
  >
    Ahora no, pregúntame en 7 días
  </button>
</div>
```

- [ ] **Step 3: Verificar en el navegador**

1. Con `session_count_v1` en 3+ en localStorage, el modal debe abrirse.
2. Hacer clic en "Ahora no, pregúntame en 7 días" — el modal debe cerrarse.
3. Verificar en DevTools → Application → Local Storage que `feedback_snooze_until` existe y contiene un timestamp ~7 días en el futuro.
4. Recargar la página — el modal NO debe volver a aparecer.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/FeedbackModal.tsx
git commit -m "feat(feedback): agregar opción de posponer encuesta 7 días"
```

---

### Task 3: Actualizar textos del header

**Files:**
- Modify: `src/components/dashboard/FeedbackModal.tsx:109-125`

- [ ] **Step 1: Cambiar título y subtítulo**

Reemplazar el bloque del header (líneas 115–125):

```tsx
<DialogHeader className="space-y-0 text-left">
  <DialogTitle className="font-heading text-xl font-bold text-white">
    Ayúdanos a mejorar tu experiencia
  </DialogTitle>
</DialogHeader>
```

Por:

```tsx
<DialogHeader className="space-y-0 text-left">
  <DialogTitle className="font-heading text-xl font-bold text-white">
    Tu opinión vale mucho
  </DialogTitle>
  <p className="text-white/75 font-body text-sm mt-0.5">
    5 preguntas rápidas de tu experiencia real
  </p>
</DialogHeader>
```

- [ ] **Step 2: Verificar en el navegador**

Con el modal visible, confirmar que el header muestra:
- Título: "Tu opinión vale mucho"
- Subtítulo debajo del título: "5 preguntas rápidas de tu experiencia real"
- El texto de tiempo "Solo te tomará 1-2 minutos..." sigue visible abajo del ícono del reloj

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/FeedbackModal.tsx
git commit -m "feat(feedback): actualizar textos del header del modal"
```
