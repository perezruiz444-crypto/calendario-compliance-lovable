import type { TareaPrioridad } from '@/types';

const PRIORIDADES: readonly TareaPrioridad[] = ['alta', 'media', 'baja'];

/** Normaliza un valor de BD (string | null) a una prioridad válida; 'media' por defecto. */
export function toPrioridad(value: string | null | undefined): TareaPrioridad {
  return PRIORIDADES.find((p) => p === value) ?? 'media';
}
