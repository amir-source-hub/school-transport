import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../common/errors';
import { parseEditableAddressFields } from './address-update';

describe('family address update field policy', () => {
  it('keeps only documented editable address fields', () => {
    expect(parseEditableAddressFields({ city: 'Tehran', streetAddress: 'Valiasr Street' })).toEqual(
      { city: 'Tehran', streetAddress: 'Valiasr Street' },
    );
  });

  it.each(['id', 'userId', 'isActive', 'createdAt', 'updatedAt'])(
    'rejects protected persistence field %s',
    (field) => {
      expect(() => parseEditableAddressFields({ [field]: 'attacker-value' })).toThrow(
        ValidationError,
      );
    },
  );

  it('rejects invalid field types and empty updates', () => {
    expect(() => parseEditableAddressFields({ postalCode: 12345 })).toThrow(ValidationError);
    expect(() => parseEditableAddressFields({})).toThrow(ValidationError);
  });
});
