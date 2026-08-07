import { ValidationError } from 'class-validator';

export type FieldErrors = Record<string, string[]>;

export function mapValidationErrors(
  errors: ValidationError[],
  prefix = '',
): FieldErrors {
  const result: FieldErrors = {};

  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];

    if (messages.length > 0) {
      result[path] = (result[path] ?? []).concat(messages);
    }

    if (error.children?.length) {
      for (const [key, value] of Object.entries(
        mapValidationErrors(error.children, path),
      )) {
        result[key] = (result[key] ?? []).concat(value);
      }
    }
  }

  return result;
}

export function validationErrorMessage(fieldErrors: FieldErrors): string {
  const entry = Object.values(fieldErrors)[0];
  if (!entry || entry.length === 0) {
    return 'اطلاعات واردشده معتبر نیست.';
  }
  return entry[0];
}