import { useCallback, useRef, useState } from 'react';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Milliseconds to wait before attempting recovery (default: 30 000) */
  resetTimeout?: number;
}

interface CircuitBreakerResult {
  /** Current circuit state */
  state: CircuitState;
  /**
   * Wraps an async function with circuit-breaker logic.
   * - CLOSED  → executes fn normally, counts failures
   * - OPEN    → rejects immediately without calling fn
   * - HALF_OPEN → executes fn once as a probe; success closes, failure reopens
   */
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Manually reset the circuit back to CLOSED */
  reset: () => void;
}

/**
 * Circuit breaker pattern for React.
 *
 * Usage:
 *   const { state, execute } = useCircuitBreaker({ failureThreshold: 3 });
 *
 *   if (state === 'OPEN') return <ServiceUnavailableMessage />;
 *
 *   const data = await execute(() => supabase.from('empresas').select('*'));
 */
export function useCircuitBreaker(config: CircuitBreakerConfig = {}): CircuitBreakerResult {
  const failureThreshold = config.failureThreshold ?? 5;
  const resetTimeout = config.resetTimeout ?? 30_000;

  const [state, setState] = useState<CircuitState>('CLOSED');
  const failures = useRef(0);
  const openedAt = useRef<number | null>(null);

  const reset = useCallback(() => {
    failures.current = 0;
    openedAt.current = null;
    setState('CLOSED');
  }, []);

  const execute = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      // If OPEN, check if recovery window has elapsed
      if (state === 'OPEN') {
        const elapsed = Date.now() - (openedAt.current ?? 0);
        if (elapsed >= resetTimeout) {
          setState('HALF_OPEN');
        } else {
          throw new Error(
            'El servicio no está disponible temporalmente. Intenta de nuevo en unos momentos.'
          );
        }
      }

      try {
        const result = await fn();
        // Success — reset counters and close circuit
        failures.current = 0;
        openedAt.current = null;
        if (state !== 'CLOSED') setState('CLOSED');
        return result;
      } catch (err) {
        failures.current += 1;

        if (failures.current >= failureThreshold) {
          openedAt.current = Date.now();
          setState('OPEN');
        } else if (state === 'HALF_OPEN') {
          // Probe failed — reopen immediately
          openedAt.current = Date.now();
          setState('OPEN');
        }

        throw err;
      }
    },
    [state, failureThreshold, resetTimeout]
  );

  return { state, execute, reset };
}
