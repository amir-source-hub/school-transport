import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('over-capacity route assignment migration', () => {
  const migration = readFileSync(
    resolve(__dirname, '../../../drizzle/0059_allow_over_capacity_route_assignments.sql'),
    'utf8',
  );

  it('removes the database capacity rejection but retains assignment integrity rules', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION enforce_transport_run_assignment()');
    expect(migration).not.toContain('Service run capacity exceeded');
    expect(migration).not.toMatch(/assigned_count\s*>=\s*vehicle_capacity/);
    expect(migration).toContain("IF NOT NEW.is_active THEN RETURN NEW");
    expect(migration).toContain("Service run must be active");
    expect(migration).toContain("Student already has an active route for this direction");
  });
});
