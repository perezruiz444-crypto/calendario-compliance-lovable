import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

/**
 * Enforces a sliding-window rate limit using the rate_limit_events table.
 *
 * @param ip        - Client IP (from x-forwarded-for header)
 * @param action    - Identifier for the action ('create_user', 'send_invitation', …)
 * @param max       - Max allowed requests in the window (default 10)
 * @param windowSec - Window size in seconds (default 60)
 * @returns A 429 Response if the limit is exceeded, null if the request is allowed.
 */
export async function enforceRateLimit(
  ip: string,
  action: string,
  max = 10,
  windowSec = 60
): Promise<Response | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const windowStart = new Date(Date.now() - windowSec * 1000).toISOString();

  // Count recent events for this IP + action
  const { count, error: countErr } = await supabase
    .from('rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('action', action)
    .gte('created_at', windowStart);

  if (countErr) {
    // Fail open — don't block if we can't check
    console.warn('[rateLimiter] count error:', countErr.message);
    return null;
  }

  if ((count ?? 0) >= max) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please wait and try again.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(windowSec),
        },
      }
    );
  }

  // Record this request
  await supabase.from('rate_limit_events').insert({ ip_address: ip, action });

  // Prune old entries (best-effort, don't await to keep latency low)
  supabase
    .from('rate_limit_events')
    .delete()
    .lt('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .then(() => {});

  return null;
}

/** Extracts the real client IP from Deno Request headers. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
