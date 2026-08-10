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
              educationOptions: [{ level: 'ابتدایی', grades: ['اول', 'دوم'] }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(getSchools()).resolves.toMatchObject({
      source: 'api',
      schools: [
        {
          id: 'school-1',
          name: 'مدرسه واقعی',
          educationOptions: [{ level: 'ابتدایی', grades: ['اول', 'دوم'] }],
        },
      ],
    });
  });

  it('surfaces backend failures instead of substituting mock data', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'));
    await expect(getSchools()).rejects.toThrow();
  });
});
