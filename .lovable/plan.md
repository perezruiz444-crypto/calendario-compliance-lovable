# Plan — Activación rápida de obligaciones y split de Padrón

## Parte 1 — Estado actual del catálogo

Categorías/programas existentes hoy en `obligaciones_catalogo`:
- `immex`, `prosec`, `cert_iva_ieps`, `padron`, `general`, `oea`, `otro`

**No existe** distinción entre Padrón **General** y Padrón **Sectorial/Específico**: hay un único `programa = 'padron'` con 3 obligaciones mezcladas (Forma A1, Renovación Padrones Sectoriales, Verificación Datos Padrón Importadores).

También importante: la tabla `empresa_programas` tiene un CHECK que solo permite `('immex','prosec','padron','cert_iva_ieps','general')`. Y **no existen triggers** que generen ocurrencias automáticamente al insertar en `empresa_programas` (a pesar de lo que dice el spec). Hoy la generación se hace llamando manualmente a `generar_ocurrencias_obligacion(obligacion_id)`.

---

## Parte 2 — Cómo agregar obligaciones rápido desde SQL Editor

Dado que no hay trigger automático en `empresa_programas`, el flujo más rápido y confiable es **insertar directo en `obligaciones` desde el catálogo** y luego disparar la generación anual.

### Snippet reutilizable (cambia solo el RFC y los programas)

```sql
WITH emp AS (
  SELECT id FROM empresas WHERE rfc = 'XXXX010101XXX' LIMIT 1
),
nuevas AS (
  INSERT INTO obligaciones (
    empresa_id, catalogo_id, categoria, nombre, descripcion,
    articulos, presentacion, fecha_vencimiento, estado, activa, created_by
  )
  SELECT
    emp.id, c.id, c.categoria, c.nombre, c.descripcion,
    c.articulos, c.presentacion,
    -- fecha semilla: primer vencimiento del año actual
    make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int,
              COALESCE(c.mes_vencimiento, 1),
              LEAST(COALESCE(c.dia_vencimiento,1), 28)),
    'vigente', true, auth.uid()
  FROM obligaciones_catalogo c, emp
  WHERE c.activo = true
    AND c.programa IN ('immex','prosec','padron','cert_iva_ieps','general') -- ajusta aquí
  ON CONFLICT (empresa_id, catalogo_id, fecha_vencimiento)
    WHERE catalogo_id IS NOT NULL AND fecha_vencimiento IS NOT NULL
    DO NOTHING
  RETURNING id
)
SELECT generar_ocurrencias_obligacion(id) FROM nuevas;
```

Esto:
1. Toma la empresa por RFC.
2. Inserta una "semilla" por cada obligación de los programas indicados.
3. La función `generar_ocurrencias_obligacion` expande el año completo (mensuales, trimestrales, anuales, etc.).

Si solo quieres un programa, deja `programa IN ('immex')`.

### Opcional: registrar también en `empresa_programas`

```sql
INSERT INTO empresa_programas (empresa_id, programa, activo, fecha_inicio)
SELECT id, unnest(ARRAY['immex','prosec']), true, CURRENT_DATE
FROM empresas WHERE rfc = 'XXXX010101XXX'
ON CONFLICT (empresa_id, programa) DO UPDATE SET activo = true;
```

Esto deja consistente la UI del tab "Programas" en EmpresaDetail.

---

## Parte 3 — Split Padrón General vs Padrón Sectorial

Propongo crear **dos programas separados** en el catálogo, al mismo nivel que `immex`/`prosec`:

| Programa nuevo | Cubre | Obligaciones que migran del actual `padron` |
|---|---|---|
| `padron_general` | Padrón de Importadores (registro base SAT) | `Verificación de Datos Padrón de Importadores`, `Declaración de Valor (Forma A1) — Muestreo` |
| `padron_sectorial` | Padrones Sectoriales específicos (Anexo 10 RGCE) | `Renovación Padrones Sectoriales` |

### Migración SQL (estructura)

```sql
-- 1. Ampliar el CHECK de empresa_programas
ALTER TABLE empresa_programas DROP CONSTRAINT empresa_programas_programa_check;
ALTER TABLE empresa_programas ADD CONSTRAINT empresa_programas_programa_check
  CHECK (programa IN ('immex','prosec','padron_general','padron_sectorial','cert_iva_ieps','general'));

-- 2. Reclasificar catálogo
UPDATE obligaciones_catalogo
SET programa = 'padron_general', categoria = 'padron_general'
WHERE programa = 'padron'
  AND nombre IN (
    'Verificación de Datos Padrón de Importadores',
    'Declaración de Valor (Forma A1) — Muestreo'
  );

UPDATE obligaciones_catalogo
SET programa = 'padron_sectorial', categoria = 'padron_sectorial'
WHERE programa = 'padron'
  AND nombre = 'Renovación Padrones Sectoriales';

-- 3. Migrar empresas que ya tenían 'padron'
UPDATE empresa_programas SET programa = 'padron_general' WHERE programa = 'padron';
-- (las que también tengan sectoriales se agregan a mano según el caso)
```

### Cambios de UI implicados

- `EmpresaProgramasTab`, `ProgramaRow`, `OnboardingEmpresaWizard`: agregar las 2 nuevas filas con sus íconos y labels ("Padrón General", "Padrón Sectorial").
- `CatalogoAdmin`: actualizar selector de programa.
- Filtros/colores en Calendario y Reportes que hoy usen `padron` → mapear a los 2 nuevos (mantener `padron` como alias retrocompatible si quedara algún registro huérfano).

---

## Preguntas para confirmar antes de ejecutar

1. ¿Hago la migración del split de Padrón ahora (estructura + reclasificación + UI), o solo te dejo el snippet de la Parte 2 para que sigas activando empresas a mano por ahora?
2. Para Padrón Sectorial, ¿quieres que en el catálogo agregue ya obligaciones específicas por sector (siderúrgico, textil, calzado, etc.) o por ahora dejamos la genérica "Renovación Padrones Sectoriales"?
