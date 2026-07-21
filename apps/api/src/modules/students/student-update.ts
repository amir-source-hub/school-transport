import { ValidationError } from '../../common/errors';

const EDITABLE_STUDENT_FIELDS = new Set(['firstName', 'lastName', 'grade', 'className']);

export type EditableStudentFields = Partial<{
  firstName: string;
  lastName: string;
  grade: string;
  className: string;
}>;

export function parseEditableStudentFields(data: Record<string, unknown>): EditableStudentFields {
  const fields: EditableStudentFields = {};

  for (const [key, value] of Object.entries(data)) {
    if (!EDITABLE_STUDENT_FIELDS.has(key)) {
      throw new ValidationError(`Field '${key}' cannot be changed through this endpoint.`);
    }
    if (value !== undefined && typeof value !== 'string') {
      throw new ValidationError(`Field '${key}' must be a string.`);
    }
    if (value !== undefined) Object.assign(fields, { [key]: value });
  }

  if (Object.keys(fields).length === 0) {
    throw new ValidationError('At least one editable student field is required.');
  }

  return fields;
}
