import { ValidationError } from '../../../common/errors';

const EDITABLE_ADDRESS_FIELDS = new Set([
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
}>;

export function parseEditableAddressFields(data: Record<string, unknown>): EditableAddressFields {
  const fields: EditableAddressFields = {};

  for (const [key, value] of Object.entries(data)) {
    if (!EDITABLE_ADDRESS_FIELDS.has(key)) {
      throw new ValidationError(`Field '${key}' cannot be changed through this endpoint.`);
    }
    if (value !== undefined && typeof value !== 'string') {
      throw new ValidationError(`Field '${key}' must be a string.`);
    }
    if (value !== undefined) Object.assign(fields, { [key]: value });
  }

  if (Object.keys(fields).length === 0) {
    throw new ValidationError('At least one editable address field is required.');
  }

  return fields;
}
