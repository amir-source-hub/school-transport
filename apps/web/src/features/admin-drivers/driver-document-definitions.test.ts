import { describe, expect, it } from 'vitest';
import type { DriverDetail } from './admin-drivers-api';
import {
  buildAdminDriverDocumentSlots,
  currentDriverDocumentTypes,
} from './driver-document-definitions';

describe('admin driver document slots', () => {
  it('includes every current upload type even when no document exists', () => {
    const slots = buildAdminDriverDocumentSlots([]);

    expect(slots.map(({ documentType }) => documentType)).toEqual(currentDriverDocumentTypes);
    expect(slots.every(({ document }) => document === undefined)).toBe(true);
  });

  it('places uploaded documents in their slot and preserves legacy uploads', () => {
    const uploaded = {
      id: 'document-1',
      documentType: 'DRIVER_PHOTO',
      mimeType: 'image/jpeg',
      viewUrl: 'https://example.test/driver.jpg',
      reviewStatus: 'ACTIVE',
      rejectionReason: null,
    } satisfies DriverDetail['documents'][number];
    const legacy = {
      ...uploaded,
      id: 'document-2',
      documentType: 'COMMITMENT_LETTER_RETURNED',
    } satisfies DriverDetail['documents'][number];

    const slots = buildAdminDriverDocumentSlots([uploaded, legacy]);

    expect(slots.find(({ documentType }) => documentType === 'DRIVER_PHOTO')?.document).toBe(
      uploaded,
    );
    expect(slots.at(-1)).toEqual({
      documentType: 'COMMITMENT_LETTER_RETURNED',
      document: legacy,
    });
  });
});
