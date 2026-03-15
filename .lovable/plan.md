

# Plan: Simplificar y unificar plantillas de correo al estilo Russell Bedford

## Objetivo
Adoptar el estilo limpio y minimalista del ejemplo proporcionado en todas las plantillas. Cambiar branding a "Calendario Compliance" y firma a "El Equipo de Compliance de Russell Bedford".

## Cambios en `supabase/functions/_shared/email-templates.ts`

### 1. Reescribir `baseLayout`
- Eliminar el header con gradiente azul
- Eliminar fondo gris, sombras, bordes redondeados del contenedor
- Usar estilo simple: `font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #000000; line-height: 1.5`
- Footer con firma global:
```
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
<p>Saludos,<br>El Equipo de Compliance de Russell Bedford</p>
```
- Nota de correo automatico debajo en letra pequena

### 2. Actualizar constantes
- `BRAND_NAME` → `'Calendario Compliance'`
- Eliminar constantes de colores innecesarias (BRAND_COLOR, BRAND_COLOR_LIGHT, BG_COLOR, CARD_BG)
- Mantener solo DANGER_COLOR, WARNING_COLOR, SUCCESS_COLOR para prioridades en tablas

### 3. Simplificar cada plantilla

**testEmailTemplate**: Texto plano con saludo, mensaje en parrafo simple, sin cajas con borde coloreado.

**taskNotificationTemplate**: Tabla simple con bordes `#eee`, sin fondos de color en headers. Texto directo sin iconos emoji excesivos.

**dailySummaryTemplate**: Tabla simple, mostrar todos los items (incluidos los de valor 0). Sin iconos emoji.

**reportEmailTemplate**: Datos de empresa en texto plano, tabla simple sin fondos de color.

**userInvitationTemplate**: Seguir el patron del ejemplo — texto plano, enlace en negrita, nota de seguridad con `<hr>` separador. Referencia a "plataforma de Compliance de Russell Bedford".

### 4. Eliminar textos redundantes de cierre
Ya que el `baseLayout` incluye la firma, eliminar frases como "Accede a tu panel" o "Este es un correo de prueba" de las plantillas individuales.

## Cambios en `supabase/functions/_shared/smtp.ts`
- Cambiar el campo `from` para usar nombre de remitente: `"Equipo Compliance Russell Bedford <${email}>"`

## Cambios en `supabase/functions/send-user-invitation/index.ts`
- Actualizar el subject del correo: reemplazar "Compliance Platform" por "Calendario Compliance" (linea 151)

## Despliegue
Redesplegar las 5 Edge Functions: `send-test-email`, `send-user-invitation`, `send-task-notifications`, `send-daily-summary`, `send-report-email`.

