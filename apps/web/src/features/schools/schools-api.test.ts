import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSchools } from './schools-api';

describe('getSchools', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns validated schools from the backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: 'school-1',
              name: 'مدرسه واقعی',
              schoolType: 'PUBLIC',
              genderType: 'MIXED',
              province: 'تهران',
              city: 'تهران',
              district: null,
              address: 'خیابان نمونه',
              phoneNumber: null,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(getSchools()).resolves.toMatchObject({
      source: 'api',
      schools: [{ id: 'school-1', name: 'مدرسه واقعی' }],
    });
  });

  it('uses labeled mock data when the backend is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'));

    const result = await getSchools();

    expect(result.source).toBe('mock');
    expect(result.schools.length).toBeGreaterThan(0);
  });
});
