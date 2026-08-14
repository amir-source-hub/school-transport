import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { retentionCutoff } from './queue.service';

describe('authentication retention cutoff', () => {
  it('keeps the configured number of complete days', () => {
    expect(retentionCutoff(new Date('2026-07-22T12:00:00.000Z'), 30).toISOString()).toBe(
      '2026-06-22T12:00:00.000Z',
    );
  });
});

describe('student-photo cleanup scheduling contract', () => {
  it('uses a durable repeatable job, retry telemetry, and stale-state gauges', () => {
    const source = readFileSync(resolve(__dirname, 'queue.service.ts'), 'utf8');
    expect(source).toContain("'cleanup-student-photos'");
    expect(source).toContain("jobId: 'scheduled-student-photo-cleanup'");
    expect(source).toContain('repeat: { every: 30 * 60 * 1_000 }');
    expect(source).toContain("recordStudentPhotoCleanup('failed')");
    expect(source).toContain('setStudentPhotoStaleCounts(stale)');
    expect(source).toContain('throw error');
  });
});
