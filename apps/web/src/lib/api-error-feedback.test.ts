import { describe, expect, it } from 'vitest';
import { ApiClientError } from '@/lib/api-client';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

describe('API error feedback', () => {
  it('maps validation details to field feedback', () => {
    const error = new ApiClientError(422, 'VALIDATION_ERROR', 'unsafe raw message', 'req-1', {
      username: ['Required'],
    });

    const feedback = getApiErrorFeedback(error);
    expect(feedback.target).toBe('field');
    expect(feedback.fieldErrors).toEqual({ username: ['Required'] });
    expect(feedback.message).not.toContain('unsafe');
  });

  it('maps expired sessions to safe page feedback', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(401, 'SESSION_EXPIRED', 'technical detail', 'req-2'),
    );

    expect(feedback.target).toBe('page');
    expect(feedback.canRetry).toBe(false);
    expect(feedback.requestId).toBe('req-2');
  });

  it('maps conflicts to a retryable dialog', () => {
    const feedback = getApiErrorFeedback(
      new ApiClientError(409, 'CONCURRENT_UPDATE', 'technical detail'),
    );

    expect(feedback.target).toBe('dialog');
    expect(feedback.canRetry).toBe(true);
  });
});
