import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../../database/database.service';
import { emergencyContacts, familyAddresses, parents, users } from '../../../database/schemas';
import { FamiliesService } from './families.service';

describe('family profile home phone', () => {
  it('returns the saved guardian landline for a later student enrollment', async () => {
    const userId = '87ec0dd5-27df-4208-b21a-d894fe2a68c6';
    const database = {
      db: {
        select: vi.fn(() => ({
          from: (table: unknown) => ({
            where: () => {
              if (table === users) return { limit: async () => [{ username: 'family' }] };
              if (table === parents)
                return Promise.resolve([
                  {
                    id: 'guardian-id',
                    parentType: 'GUARDIAN',
                    firstName: 'علی',
                    lastName: 'احمدی',
                    nationalId: '0023518805',
                    phoneNumber: '09123456789',
                    homePhone: '02122113333',
                    relationshipType: 'FATHER',
                    relationshipDescription: null,
                    isPrimaryContact: true,
                    phoneVerifiedAt: new Date(),
                  },
                ]);
              if (table === familyAddresses || table === emergencyContacts)
                return Promise.resolve([]);
              throw new Error('Unexpected table');
            },
          }),
        })),
      },
    } as unknown as DatabaseService;

    const profile = await new FamiliesService(database, {} as never).getFamilyProfile(userId);

    expect(profile.guardian?.homePhone).toBe('02122113333');
  });
});
