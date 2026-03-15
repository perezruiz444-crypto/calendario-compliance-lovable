

# Plan: Landing minimalista

## Cambios en `src/pages/Index.tsx`

### Eliminar
- Array de `features` y el grid de 4 tarjetas
- Imports innecesarios: `CheckSquare`, `Users`, `TrendingUp`
- Subtitulo largo descriptivo

### Resultado final
Pantalla centrada vertical y horizontalmente con:
1. Icono/logo de la plataforma
2. Titulo: **Calendario Compliance**
3. Subtitulo corto: "Russell Bedford" o similar
4. Boton "Iniciar Sesion" con flecha

### Mantener
- Logica de redirect a `/dashboard` si hay usuario autenticado
- Logica de password recovery/invite hash
- Listener de `onAuthStateChange`

### Estilo
- `min-h-screen` con `flex items-center justify-center`
- Fondo limpio (gradient sutil actual o color solido)
- Centrado vertical y horizontal

