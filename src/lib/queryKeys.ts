/**
 * Query keys centralizadas para React Query.
 *
 * Convención: cada dominio expone una factory con keys jerárquicas.
 * - `all`: key raíz del dominio (para invalidar todo el dominio).
 * - `lists()` / `list(filtros)`: colecciones.
 * - `details()` / `detail(id)`: entidades individuales.
 *
 * Invalidar `queryKeys.empresas.all` invalida listas y detalles de empresas
 * gracias al prefijo compartido.
 *
 * Ejemplo:
 *   useQuery({ queryKey: queryKeys.empresas.list(), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.empresas.all })
 */
export const queryKeys = {
  empresas: {
    all: ['empresas'] as const,
    lists: () => [...queryKeys.empresas.all, 'list'] as const,
    list: (filtros?: Record<string, unknown>) =>
      [...queryKeys.empresas.lists(), filtros ?? {}] as const,
    details: () => [...queryKeys.empresas.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.empresas.details(), id] as const,
  },
  obligaciones: {
    all: ['obligaciones'] as const,
    lists: () => [...queryKeys.obligaciones.all, 'list'] as const,
    list: (empresaId?: string) =>
      [...queryKeys.obligaciones.lists(), empresaId ?? null] as const,
    detail: (id: string) => [...queryKeys.obligaciones.all, 'detail', id] as const,
  },
  tareas: {
    all: ['tareas'] as const,
    lists: () => [...queryKeys.tareas.all, 'list'] as const,
    list: (empresaId?: string) =>
      [...queryKeys.tareas.lists(), empresaId ?? null] as const,
    detail: (id: string) => [...queryKeys.tareas.all, 'detail', id] as const,
  },
} as const;
