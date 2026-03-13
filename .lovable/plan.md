

## Plan: Truncar nombres largos en gráfico "Top 5 Consultores por Carga"

### Problema
El eje X del BarChart muestra nombres/correos completos que desbordan el espacio cuando son muy largos.

### Solución
En `src/components/dashboard/AdminAnalytics.tsx`, agregar un `tickFormatter` al `<XAxis>` que trunca nombres a máximo 15 caracteres (con "…"), y aumentar ligeramente el width del intervalo.

### Cambio en `AdminAnalytics.tsx` (línea 51)

Reemplazar:
```tsx
<XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
```

Por:
```tsx
<XAxis 
  dataKey="nombre" 
  angle={-45} 
  textAnchor="end" 
  height={100} 
  tickFormatter={(value: string) => value.length > 15 ? value.substring(0, 15) + '…' : value}
  tick={{ fontSize: 12 }}
/>
```

Esto trunca visualmente los nombres largos en el eje, mientras el Tooltip seguirá mostrando el nombre completo al hacer hover.

| Archivo | Cambio |
|---|---|
| `src/components/dashboard/AdminAnalytics.tsx` | Agregar tickFormatter y fontSize al XAxis |

