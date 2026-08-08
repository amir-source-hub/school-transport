import { describe, expect, it } from 'vitest';
import type { SQL, BuildQueryConfig } from 'drizzle-orm';
import { buildAdminStudentArchiveWhere, buildAdminStudentOrderBy } from './student-list.sort';

const config: BuildQueryConfig = {
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (num: number) => `$${num + 1}`,
  escapeString: (value: string) => `'${value}'`,
};

function renderSql(chunk: SQL) {
  return chunk.toQuery(config);
}

describe('buildAdminStudentOrderBy', () => {
  it('orders Persian student names by lastName then firstName on the database, not JavaScript', async () => {
    const orders = buildAdminStudentOrderBy('studentName', 'asc');

    expect(orders).toHaveLength(2);
    const first = renderSql(orders[0]).sql;
    const second = renderSql(orders[1]).sql;
    expect(first).toContain('last_name');
    expect(first).toContain('asc');
    expect(second).toContain('first_name');
    expect(second).toContain('asc');
  });

  it('applies the requested direction to school name and date sorts', async () => {
    const school = renderSql(buildAdminStudentOrderBy('schoolName', 'desc')[0]).sql;
    expect(school).toContain('schools');
    expect(school).toContain('desc');

    const createdAt = renderSql(buildAdminStudentOrderBy('createdAt', 'asc')[0]).sql;
    expect(createdAt).toContain('created_at');
    expect(createdAt).toContain('asc');
  });
});

describe('buildAdminStudentArchiveWhere', () => {
  it('returns no predicate for the all filter', () => {
    expect(buildAdminStudentArchiveWhere('all')).toBeUndefined();
  });

  it('filters active students for the active filter', () => {
    const query = renderSql(buildAdminStudentArchiveWhere('active')!);
    expect(query.sql).toContain('is_active');
    expect(query.params).toContain(true);
  });

  it('filters archived students for the archived filter', () => {
    const query = renderSql(buildAdminStudentArchiveWhere('archived')!);
    expect(query.sql).toContain('is_active');
    expect(query.params).toContain(false);
  });
});
