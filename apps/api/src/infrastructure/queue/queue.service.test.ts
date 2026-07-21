import { describe, expect, it } from 'vitest';
import { retentionCutoff } from './queue.service';

describe('authentication retention cutoff', () => {
  it('keeps the configured number of complete days', () => {
    expect(retentionCutoff(new Date('2026-07-22T12:00:00.000Z'), 30).toISOString()).toBe(
      '2026-06-22T12:00:00.000Z',
    );
  });
});
