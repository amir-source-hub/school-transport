import { describe, expect, it } from 'vitest';
import {
  clearEnrollmentDraft,
  ENROLLMENT_DRAFT_KEY,
  loadEnrollmentDraft,
  saveEnrollmentDraft,
} from './enrollment-draft';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe('safe enrollment draft', () => {
  it('restores workflow choices but never persists identity, location, phone, notes, or photo data', () => {
    const storage = memoryStorage();
    saveEnrollmentDraft(
      storage as never,
      'panel',
      3,
      {
        gender: 'FEMALE',
        schoolId: 'school-1',
        grade: 'پنجم',
        studentFirst: 'سارا',
        nationalId: '0012345678',
        streetAddress: 'secret',
        latitude: 35.7,
        parentNotes: 'secret',
        photoUploadId: 'photo-1',
      },
      1_000,
    );
    expect(storage.values.get(`${ENROLLMENT_DRAFT_KEY}:panel`)).not.toMatch(
      /سارا|0012345678|secret|35\.7|photo-1/,
    );
    expect(loadEnrollmentDraft(storage as never, 'panel', 2_000)).toEqual({
      step: 3,
      values: { gender: 'FEMALE', schoolId: 'school-1', grade: 'پنجم' },
    });
  });

  it('expires, rejects malformed content, and clears drafts', () => {
    const storage = memoryStorage();
    saveEnrollmentDraft(storage as never, 'panel', 1, { city: 'تهران' }, 0);
    expect(loadEnrollmentDraft(storage as never, 'panel', 2 * 60 * 60 * 1_000 + 1)).toBeUndefined();
    storage.setItem(`${ENROLLMENT_DRAFT_KEY}:panel`, '{broken');
    expect(loadEnrollmentDraft(storage as never, 'panel')).toBeUndefined();
    saveEnrollmentDraft(storage as never, 'panel', 1, { city: 'تهران' });
    clearEnrollmentDraft(storage as never, 'panel');
    expect(storage.getItem(`${ENROLLMENT_DRAFT_KEY}:panel`)).toBeNull();
  });
});
