import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('route contract price migration', () => {
  it('widens existing rial prices without replacing or dropping them', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../drizzle/0060_route_contract_price_bigint.sql'),
      'utf8',
    );
    expect(migration).toMatch(/ALTER COLUMN "contract_price_rials" TYPE bigint/i);
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
