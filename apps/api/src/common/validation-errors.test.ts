import { describe, expect, it } from 'vitest';
import { ValidationError } from 'class-validator';
import { mapValidationErrors, validationErrorMessage } from './validation-errors';

describe('mapValidationErrors', () => {
  it('flattens top-level constraint messages', () => {
    const errors: ValidationError[] = [
      {
        target: {},
        value: '',
        property: 'nationalId',
        constraints: { isMatches: 'کد ملی باید ۱۰ رقم باشد.' },
        children: [],
      },
    ];

    expect(mapValidationErrors(errors)).toEqual({
      nationalId: ['کد ملی باید ۱۰ رقم باشد.'],
    });
  });

  it('joins nested property paths with a dot', () => {
    const errors: ValidationError[] = [
      {
        property: 'student',
        children: [
          {
            property: 'firstName',
            constraints: { isLength: 'نام باید بین ۱ تا ۱۰۰ نویسه باشد.' },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    expect(mapValidationErrors(errors)).toEqual({
      'student.firstName': ['نام باید بین ۱ تا ۱۰۰ نویسه باشد.'],
    });
  });

  it('aggregates multiple constraints for the same field', () => {
    const errors: ValidationError[] = [
      {
        property: 'service',
        children: [
          {
            property: 'paymentPlanType',
            constraints: {
              isString: 'روش پرداخت باید متن باشد.',
              isIn: 'روش پرداخت باید یکجا یا اقساطی باشد.',
            },
            children: [],
          } as ValidationError,
        ],
      } as ValidationError,
    ];

    expect(mapValidationErrors(errors)).toEqual({
      'service.paymentPlanType': [
        'روش پرداخت باید متن باشد.',
        'روش پرداخت باید یکجا یا اقساطی باشد.',
      ],
    });
  });
});

describe('validationErrorMessage', () => {
  it('returns the first field message', () => {
    expect(validationErrorMessage({ school: ['شناسه مدرسه معتبر نیست.'] })).toBe(
      'شناسه مدرسه معتبر نیست.',
    );
  });

  it('falls back to a generic message when empty', () => {
    expect(validationErrorMessage({})).toBe('اطلاعات واردشده معتبر نیست.');
  });
});
