import { describe, expect, it } from 'vitest';
import { parseAppDate } from './dates';

describe('parseAppDate', () => {
  it('keeps a database DATE on the same local calendar day', () => {
    const parsed = parseAppDate('2026-09-21');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(21);
  });

  it('preserves timestamp instants', () => {
    const value = '2026-09-21T18:30:00.000Z';

    expect(parseAppDate(value).toISOString()).toBe(value);
  });
});
