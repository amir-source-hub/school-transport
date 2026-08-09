import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateFeedbackDto, RespondFeedbackDto } from './feedback.dto';

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

  it('handles encoded, tag-like, and mixed-direction payloads as plain text', async () => {
    const encoded = await validate(
      plainToInstance(CreateFeedbackDto, {
        category: 'APP',
        subject: '&lt;img src=x onerror=alert(1)&gt;',
        message: '\u202eمتن راست به چپ\u202c &lt;script&gt;alert(1)&lt;/script&gt;',
      }),
    );
    expect(encoded).toHaveLength(0);

    for (const response of [
      '<img src=x onerror=alert(1)>',
      'متن <script>alert(1)</script>',
      'عبارت ظاهراً ساده <b onmouseover=alert(1)>',
    ]) {
      const errors = await validate(plainToInstance(RespondFeedbackDto, { response, version: 1 }));
      expect(errors.length).toBeGreaterThan(0);
    }

    await expect(
      validate(
        plainToInstance(RespondFeedbackDto, {
          response: '\u2067پاسخ فارسی\u2069 &lt;b&gt;متن&lt;/b&gt;',
          version: 1,
        }),
      ),
    ).resolves.toHaveLength(0);
  });
});
import 'reflect-metadata';
