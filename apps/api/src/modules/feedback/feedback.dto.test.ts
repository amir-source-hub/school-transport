import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateFeedbackDto } from './feedback.dto';

describe('CreateFeedbackDto', () => {
  it('accepts safe Persian text and rejects raw HTML', async () => {
    await expect(
      validate(
        plainToInstance(CreateFeedbackDto, {
          category: 'SUGGESTION',
          subject: 'پیشنهاد مسیر',
          message: 'لطفاً زمان‌بندی مسیر را بررسی کنید.',
        }),
      ),
    ).resolves.toHaveLength(0);
    const errors = await validate(
      plainToInstance(CreateFeedbackDto, {
        category: 'SUGGESTION',
        subject: '<b>موضوع</b>',
        message: '<script>alert(1)</script>',
      }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
import 'reflect-metadata';
