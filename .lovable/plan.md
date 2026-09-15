# Plan: estabilizar el acceso a empresas

## Diagnóstico confirmado
- La base de datos está activa y responde normalmente; no hay errores críticos de PostgreSQL ni de autenticación en las últimas 24 horas.
- Las 6 empresas siguen guardadas y tienen creador válido.
- Los dos administradores conservan únicamente el rol `administrador`; no hay roles duplicados.
- `get_my_role()` ya prioriza correctamente administrador sobre consultor y cliente.
- El problema confirmado está en los permisos base: no aparecen privilegios para `authenticated` sobre `empresas`, `profiles`, `user_roles` ni `consultor_empresa_asignacion`. Las reglas por usuario no pueden funcionar si falta este permiso previo.
- Además, `user_roles` y `consultor_empresa_asignacion` tienen reglas creadas pero la protección por filas está desactivada; el analizador lo marca como error de seguridad.

## Cambios propuestos
1. Restaurar los permisos mínimos para usuarios autenticados en las tablas necesarias para el selector, la lista y la edición de empresas.
2. Mantener los permisos elevados exclusivamente para operaciones internas; no conceder acceso anónimo a datos de empresas o usuarios.
3. Activar la protección por filas en `user_roles` y `consultor_empresa_asignacion` y consolidar sus reglas para evitar duplicados o recursión.
4. Ajustar las reglas de `empresas` para usar `get_my_role()`/`has_role()` de forma determinista, conservando:
   - administrador: todas las empresas;
   - consultor: solo empresas asignadas;
   - cliente: solo su empresa.
5. Restringir la ejecución pública de las funciones sensibles que el analizador detectó, sin bloquear las funciones que la app necesita estando autenticado.
6. Validar después del cambio los tres perfiles de acceso y confirmar que un administrador recibe las 6 empresas desde la misma consulta usada por el selector y el menú.

## Resultado esperado
El administrador podrá volver a listar, seleccionar y editar todas las empresas, mientras consultores y clientes mantendrán su alcance limitado. No se eliminarán empresas, obligaciones ni usuarios.
