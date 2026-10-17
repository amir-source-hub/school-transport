import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('round-trip route direction migration', () => {
  it('removes the original two-direction check without dropping routes', () => {
    const original = readFileSync(
      resolve(__dirname, '../../../drizzle/0037_transport_service_runs.sql'),
      'utf8',
    );
    const replacement = readFileSync(
      resolve(__dirname, '../../../drizzle/0052_route_contract_terms.sql'),
      'utf8',
    );
    const correction = readFileSync(
      resolve(__dirname, '../../../drizzle/0061_remove_legacy_route_direction_check.sql'),
      'utf8',
    );
    expect(original).toContain("CHECK (\"direction\" IN ('TO_SCHOOL', 'FROM_SCHOOL'))");
    expect(replacement).toContain("'ROUND_TRIP'");
    expect(correction).toMatch(/DROP CONSTRAINT IF EXISTS "transport_service_runs_direction_check"/);
    expect(correction).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
