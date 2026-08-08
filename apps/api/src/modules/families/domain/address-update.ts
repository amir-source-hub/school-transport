import { ValidationError } from '../../../common/errors';

const EDITABLE_ADDRESS_FIELDS = new Set([
  'title',
  'province',
  'city',
  'district',
  'streetAddress',
  'postalCode',
  'latitude',
  'longitude',
]);

const STRING_FIELDS = new Set([
  'title',
  'province',
  'city',
  'district',
  'streetAddress',
  'postalCode',
]);

export type EditableAddressFields = Partial<{
  title: string;
  province: string;
  city: string;
  district: string;
  streetAddress: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}>;

export function parseEditableAddressFields(data: Record<string, unknown>): EditableAddressFields {
  const fields: EditableAddressFields = {};

  for (const [key, value] of Object.entries(data)) {
    if (!EDITABLE_ADDRESS_FIELDS.has(key)) {
      throw new ValidationError(`Field '${key}' cannot be changed through this endpoint.`);
    }
    if (value === undefined) continue;
    if (STRING_FIELDS.has(key)) {
      if (typeof value !== 'string') {
        throw new ValidationError(`Field '${key}' must be a string.`);
      }
      Object.assign(fields, { [key]: value });
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ValidationError(`Field '${key}' must be a number.`);
    }
    if (key === 'latitude' && (value < -90 || value > 90)) {
      throw new ValidationError(`Field '${key}' must be between -90 and 90.`);
    }
    if (key === 'longitude' && (value < -180 || value > 180)) {
      throw new ValidationError(`Field '${key}' must be between -180 and 180.`);
    }
    Object.assign(fields, { [key]: value });
  }

  if (Object.keys(fields).length === 0) {
    throw new ValidationError('At least one editable address field is required.');
  }

  return fields;
}
