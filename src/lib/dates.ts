const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse database DATE values as local calendar dates, not UTC instants. */
export function parseAppDate(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());
  return new Date(DATE_ONLY_PATTERN.test(value) ? `${value}T12:00:00` : value);
}
