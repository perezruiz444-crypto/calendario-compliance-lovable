## Causa raíz (confirmada en la BD)

Tu usuario `perezruiz444@gmail.com` (`5d30eb0b…`) tiene **dos filas en `user_roles`**: `cliente` y `administrador`.

Toda la app resuelve el rol con la función `get_my_role()`:

```sql
SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
```

No tiene `ORDER BY`, así que con dos filas Postgres puede devolver **`cliente`**. Cuando eso pasa:

- La política `empresas_select_scoped` entra por la rama de cliente y solo deja ver la empresa de tu `profiles.empresa_id` → el menú de Empresas y el selector se quedan vacíos.
- `useAuth` (línea 96) llama a la misma RPC, así que la UI también te trata como cliente.

Es intermitente por diseño: depende del plan de ejecución, por eso "a veces" sí veías todo.

## Plan de corrección

**1. Hacer `get_my_role()` determinista (migración)**

Redefinir la función para que devuelva siempre el rol de mayor privilegio:

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'administrador' THEN 1
    WHEN 'consultor'     THEN 2
    ELSE 3 END
  LIMIT 1;
$$;
```

Sin cambiar firma ni políticas: todas las RLS que ya la usan se corrigen solas.

**2. Limpiar la fila `cliente` sobrante de tu usuario admin** (operación de datos, reversible: se puede reinsertar).

**3. Verificación**

- Consultar `get_my_role()` y las empresas visibles para tu `user_id`.
- Abrir `/empresas` en el preview y confirmar que aparecen todas y que el selector se llena.

## Hallazgo adicional (aparte, te lo señalo sin tocarlo aún)

`user_roles` tiene **RLS deshabilitado** (sus 3 políticas están inactivas). No es la causa de este bug, pero es un riesgo: cualquier usuario autenticado puede leer los roles de todos. Si quieres, lo activo en una migración aparte después de confirmar que el fix principal funciona.
