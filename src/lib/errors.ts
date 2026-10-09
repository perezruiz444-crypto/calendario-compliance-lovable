/**
 * Lee el mensaje de cualquier valor capturado en un `catch` (que es `unknown`).
 * Cubre `Error`, errores planos de Supabase/PostgREST (`{ message, code }`) y strings.
 * Devuelve `fallback` (vacío por defecto) si no hay mensaje, así `getErrorMessage(e) || 'texto'` conserva la semántica de `e.message || 'texto'`.
 */
export function getErrorMessage(error: unknown, fallback = ''): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') return message || fallback;
  }
  return fallback;
}

/** Lee `code` de un error plano (p. ej. PostgrestError). */
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}
