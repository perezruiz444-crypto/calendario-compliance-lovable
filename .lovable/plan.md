

## Plan: Mejorar visualizacion de eventos en el calendario

### Problema actual
react-big-calendar en vista mensual muestra los eventos como barras de texto que se desbordan rapidamente. Cuando hay mas de 2-3 eventos en un dia, aparece un pequeño "+N mas" que es facil de ignorar. No hay indicadores visuales (badges, dots) que muestren de un vistazo cuantos eventos tiene cada dia.

### Cambios propuestos

#### 1. Custom CSS para react-big-calendar
**Archivo:** `src/index.css`
- Hacer el indicador "+N mas" mas visible: fondo con color, texto mas grande, negrita
- Mejorar el contraste de las celdas del dia con eventos
- Hacer la celda del dia actual mas destacada
- Estilizar el header de cada dia para que se vea el numero mas claro

#### 2. Componente custom `DateCellWrapper` con badges de conteo
**Archivo:** `src/components/dashboard/DashboardCalendar.tsx`
- Crear un componente `CustomDateHeader` que renderiza el numero del dia junto con badges de colores mostrando el conteo de eventos por tipo:
  - Circulo rojo con numero = tareas
  - Circulo azul con numero = documentos
  - Circulo morado con numero = obligaciones/programas
- Esto permite ver de un vistazo cuantos eventos hay sin necesidad de que se muestren las barras completas
- Usar la prop `components.month.dateHeader` de react-big-calendar

#### 3. Tooltip al hacer hover en el "+N mas"
- Usar la prop `onShowMore` para abrir la vista de dia directamente al hacer click en "+N mas", en vez de solo mostrar un popup

#### 4. Reducir truncamiento: mostrar mas eventos por celda
- Ajustar CSS para que las celdas del mes tengan mas altura minima
- O alternativamente, usar `popup` prop para mostrar overlay con todos los eventos al click en "+N mas"

### Detalle tecnico

```text
Vista mensual mejorada:
┌─────────┬─────────┬─────────┐
│ 15      │ 16      │ 17      │
│ 🔴3 🔵1 │         │ 🔴1 🟣2 │  ← badges de conteo
│ ▪ Tarea │         │ ▪ Tarea │  ← eventos visibles
│ ▪ Tarea │         │ +2 más  │  ← "+N más" destacado
│ ▪ Doc.. │         │         │
└─────────┴─────────┴─────────┘
```

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/dashboard/DashboardCalendar.tsx` | Custom `DateHeader` con badges de conteo por tipo, activar `popup` prop, pasar `onDrillDown` para navegar a vista dia |
| `src/index.css` | Estilos CSS para "+N mas" mas visible, celdas con mas altura, badges de conteo |

