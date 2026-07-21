import { describe, expect, it } from 'vitest';
import { createQueryClient } from '@/lib/query-client';

describe('query client defaults', () => {
  it('does not retry mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('uses bounded query retries and avoids focus refetches', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});
