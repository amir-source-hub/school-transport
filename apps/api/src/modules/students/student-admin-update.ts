import { ValidationError } from '../../common/errors';

const EDITABLE_STUDENT_FIELDS = new Set([
  'firstName',
  'lastName',
  'nationalId',
  'birthDate',
  'gender',
  'schoolId',
  'className',
  'grade',
]);

export type AdminEditableStudentFields = Partial<{
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string;
  gender: string;
  schoolId: string;
  className: string;
  grade: string;
}>;

export function parseAdminEditableStudentFields(data: object): AdminEditableStudentFields {
  const fields: AdminEditableStudentFields = {};

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
