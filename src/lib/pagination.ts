type PageResult<T> = { data: T[] | null; error: unknown };

/** Conserva todas las filas aunque el servidor entregue menos que el tamaño solicitado. */
export async function loadAllPages<T>(
  fetchPage: (offset: number, pageSize: number) => PromiseLike<PageResult<T>>,
  pageSize = 250,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('pageSize debe ser un entero positivo');
  const rows: T[] = [];
  while (true) {
    const { data, error } = await fetchPage(rows.length, pageSize);
    if (error) throw error;
    const page = data ?? [];
    if (page.length === 0) return rows;
    rows.push(...page);
  }
}
