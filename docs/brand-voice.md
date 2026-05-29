# Voz de Marca — Calendario Compliance

## En una frase

Calendario Compliance hace que el cumplimiento regulatorio de comercio exterior sea manejable, visible y confiable — respaldado por Russell Bedford.

---

## A quién le hablamos

| Perfil | Lo que necesita | Tono específico |
|---|---|---|
| Director de Comercio Exterior | Claridad ejecutiva, no detalles operativos | Conciso, orientado a riesgo e impacto |
| Gerente de Cumplimiento | Estado exacto, procedimientos claros | Preciso y accionable |
| Contador / Responsable operativo | Instrucciones paso a paso | Directo, sin ambigüedad |

---

## Los 4 principios de voz

### 1. Claro sobre técnico
Cuando puedes decirlo simple, dilo simple.

- "Tu programa IMMEX está al corriente." — correcto
- "El estado del registro de cumplimiento es completado." — incorrecto

Nunca uses en copy visible: RLS, UUID, endpoint, payload, JWT, schema.

### 2. Orientador, no bloqueador
Todo mensaje de error dice qué pasó **y** qué hacer. No termines en el error.

- "No se pudo guardar el cambio. Intenta de nuevo o contacta a soporte." — correcto
- "Error al actualizar: undefined is not a function" — incorrecto

### 3. Confianza sin soberbia
Reconoce logros con discreción. Sin exclamaciones de fiesta.

- "Obligación registrada." — correcto
- "¡Fantástico! ¡Lo lograste! 🎉" — incorrecto

Está bien una exclamación en bienvenidas. En confirmaciones operativas, nunca.

### 4. Russell Bedford al fondo, Calendario al frente
En la interfaz, la marca es **Calendario Compliance**. Russell Bedford aparece en:
- Firmas de emails transaccionales
- Contextos de soporte ("contacta a tu consultor Russell Bedford")
- Footer de emails

---

## Tabla: Evitar / Usar

| Evitar | Usar |
|---|---|
| "Error al cargar" (sin contexto) | "No se pudo cargar [X]. [Acción recomendada]." |
| "RLS de nivel empresarial" | "Solo tú y tu consultor asignado tienen acceso." |
| RLS, UUID, endpoint, payload | — nunca en copy visible — |
| "¡Fantástico!", "¡Increíble!", "¡Lo lograste!" | nada / "Listo." / "Guardado." |
| "Has sido invitado/a" (pasivo) | "Tu acceso está listo" |
| "Por favor no responda a este mensaje." | "Para consultas, contacta directamente a tu consultor Russell Bedford." |
| "Sin definir" | "Sin especificar" o campo vacío con placeholder |
| "Contacta al administrador." | "Contacta a tu consultor Russell Bedford." |

---

## Plantillas reutilizables para developers

Úsalas como punto de partida para cualquier string nuevo de UI:

```
Error genérico:
  "No se pudo [acción]. [Solución o contacto]."
  Ejemplo: "No se pudieron cargar las empresas. Recarga la página."

Éxito genérico:
  "[Elemento] [acción en pasado] correctamente."
  Ejemplo: "Cambios guardados correctamente."

Empty state activo (el usuario puede hacer algo):
  "Aún no hay [elemento]. [Cómo agregarlo o a quién contactar]."
  Ejemplo: "Aún no hay documentos. Tu consultor puede cargarlos cuando los necesites."

Empty state pasivo (solo informar):
  "Sin [elemento] en este periodo."
  Ejemplo: "Sin vencimientos en este rango de fechas."

Confirmación destructiva:
  "¿Seguro que quieres [acción]? Esta operación no se puede deshacer."

Validación de formulario:
  "Ingresa un [campo] válido (ej. [ejemplo])."
  Ejemplo: "Ingresa un correo electrónico válido (ej. nombre@empresa.com)"

Error de formulario general:
  "Revisa los campos marcados antes de continuar."
```

---

## Cómo usar este documento

- **En code review**: cualquier PR que toque strings de UI debe verificarse contra la tabla "Evitar / Usar" de arriba.
- **Al escribir copy nuevo**: elige la plantilla más cercana y adáptala.
- **En emails**: usa "usted" solo si el contexto es muy formal. En la interfaz, siempre "tú".
- **Después de cada sprint**: revisa toasts y empty states nuevos contra este documento.
