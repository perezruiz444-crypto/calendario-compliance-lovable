

# Plan: Activar obligaciones existentes que ya tienen fecha

## Problema
Las obligaciones de Johnson (y otras empresas) ya tienen `fecha_vencimiento` asignada pero el campo `activa` sigue en `false` porque fueron creadas antes de implementar la auto-activacion. El codigo nuevo solo aplica para ediciones futuras, no corrige los datos existentes.

## Solucion

### 1. Migracion SQL para corregir datos existentes

Ejecutar un UPDATE que ponga `activa = true` en todas las obligaciones que tengan alguna fecha asignada pero esten inactivas:

```sql
UPDATE obligaciones
SET activa = true
WHERE activa = false
  AND (fecha_vencimiento IS NOT NULL OR fecha_inicio IS NOT NULL OR fecha_fin IS NOT NULL);
```

Esto es todo lo que se necesita. No hay cambios de codigo — la logica de auto-activacion en el frontend ya esta implementada correctamente para ediciones futuras.

### Archivos/recursos a modificar

| Recurso | Cambio |
|---------|--------|
| Database migration | UPDATE obligaciones existentes para activarlas |

