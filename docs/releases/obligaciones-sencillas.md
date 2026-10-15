# Obligaciones sencillas — entrega de octubre de 2026

Base: main c33a6438c1ddff3de08e8e0a26057482ab115e3b.
La publicación del sitio es manual en Lovable. Un merge o una migración
aplicada no acreditan que el sitio público ya use esta versión.

## Comportamiento

Las obligaciones se organizan en Acciones, Vigencias, Condiciones y Por evento.
Los clientes entran por Pendientes o Mi Empresa; calendario, ayuda y ajustes
quedan como herramientas secundarias. Se distinguen objetivos internos,
límites validados y fechas heredadas. El porcentaje mensual cuenta entregas
del periodo, conserva la identidad de cada ocurrencia y excluye condiciones
permanentes y riesgos.

Se pueden registrar revisiones y eventos con evidencia privada, consultar el
historial completo y descargar PDF. Un evento sin regla validada permanece
como acción sin vencimiento inventado. La próxima revisión de una condición
es un objetivo interno y aparece en calendario, avisos y resumen diario.
La generación periódica no crea atrasos anteriores al alta de la obligación.

El administrador puede cambiar la clasificación operativa mediante una nueva
versión. Esto no valida una norma ni modifica las fechas históricas.
Se preservan las asignaciones directas y las de la tabla de responsables.
Las escrituras se validan en servidor con la sesión del usuario; nunca
se usa service role en el navegador. Los clientes pueden registrar cumplimientos y subir evidencia en cualquier
obligación activa de su empresa, aunque no tengan una asignación individual.
Administradores conservan todas las empresas y consultores sus empresas asignadas.

## Adopción y límites

La adopción IMMEX/CERTIVA incorpora 65 clasificaciones operativas vinculadas
por ID, nombre y programa del catálogo. Dos definiciones mixtas se conservan
Por revisar. Las demás obligaciones sin clasificación también siguen visibles.
Todas las reglas importadas mantienen la validación normativa pendiente:
no se generan nuevos plazos legales hasta validar fuentes, parámetros y,
cuando corresponda, calendario hábil. Las fechas existentes no se borran.
immex-certiva-clasificacion-borrador.csv conserva la propuesta inicial;
immex-certiva-adopcion.json identifica la adopción operativa explícita.

VITE_OBLIGACIONES_V2 está activo por defecto. El valor literal false
restaura la interfaz anterior tras reconstruir y publicar. Ese flag no revierte
las migraciones ni el resumen diario desplegado.

## Orden de publicación

1. Respaldar tablas y contrato actual; comprobar permisos y coincidencias del catálogo.
2. Aplicar únicamente las migraciones nuevas, en orden de nombre.
3. Verificar conservación del historial, permisos y clasificación adoptada.
4. Integrar el PR con CI correcto. El workflow de main despliega las funciones
   de Supabase con su configuración existente; comprobar su resultado.
5. Publicar desde el editor Lovable y comprobar el sitio público por rol.

## Validación reproducible

npm run test:ui, npm run typecheck, npm run lint, npm run build.
El baseline de lint contiene 59 advertencias y cero errores.

npm run test:obligations:browser usa Vite y Supabase ficticio en loopback,
intercepta el transporte y bloquea hosts externos. Requiere Playwright y Chrome,
o las variables PLAYWRIGHT_MODULE y CHROME_EXECUTABLE. Incluye permisos,
errores/reintentos, revisiones, eventos, cumplimiento por evento, PDF y Agenda.
No acredita inicio de sesión ni entrega de correo o push reales.

npm run test:obligations:sql usa exclusivamente PostgreSQL aislado en
127.0.0.1:55439, base calendario_obligaciones_test, usuario postgres.
Inicializar una instancia vacía con supabase/tests/obligation-block-a-bootstrap.sql;
es un contrato mínimo sintético y nunca debe ejecutarse en una base real.
El runner comprueba identidad local y datos ficticios, reaplica la migración
base y ejecuta nueve contratos con rollback. Incluye acceso a evidencia,
asignación directa, idempotencia y separación de usuarios en avisos.

La función de resumen se comprueba con Deno sin invocar el envío real.
Los resultados y respaldos con datos de clientes se conservan fuera de Git.

El guardado de cumplimiento usa registrar_cumplimiento_obligacion: reemplaza
el estado vigente mediante otra versión, conserva evidencia/historial y no
duplica en reintentos. Una prueba adicional usa dos sesiones PostgreSQL locales
concurrentes. Los archivos ya subidos se reutilizan al reintentar el guardado.
