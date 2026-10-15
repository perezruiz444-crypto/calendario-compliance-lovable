/** Los fixtures nunca pueden apuntar al proyecto publicado, aunque el entorno esté mal configurado. */
export function assertLocalSupabase(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Las pruebas solo admiten Supabase local');
  }
}
