const ALLOWED_ORIGINS = [
  'https://calendario-compliance.vercel.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

// Dynamic CORS headers based on request origin (use in new functions)
export function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Static export kept for backward compatibility with existing functions
// Update ALLOWED_ORIGINS above when a custom domain is configured
export const corsHeaders = getCorsHeaders(null);
