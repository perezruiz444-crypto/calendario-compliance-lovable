# Reversión de obligaciones sencillas

Procedimiento preparado; no ejecutarlo automáticamente.

Configurar VITE_OBLIGACIONES_V2=false, reconstruir y publicar restaura la
navegación y lectores anteriores. Pendientes redirige al Dashboard. Esta
reversión solo afecta la interfaz: no restaura el motor de fechas ni el correo.

Conservar tablas, eventos, revisiones, evidencias e historial. No hacer DROP,
no modificar fechas en masa ni restaurar permisos amplios. Los controles de
escritura de cumplimiento y de acceso a evidencia deben mantenerse.

Si una función SQL presenta incompatibilidad, preparar una migración correctiva
revisada. El respaldo previo conserva las definiciones anteriores, pero su
restauración debe evaluar las nuevas escrituras realizadas después del cambio.
La función send-daily-summary puede volver a su fuente anterior conservada
en el respaldo; conservar su autenticación y verify_jwt. Coordinar esa reversión
con la interfaz para evitar volver a contar condiciones como vencimientos.

Cada reversión de main puede disparar el workflow de funciones. Comprobar CI,
el despliegue de Supabase y la publicación manual de Lovable por separado.
