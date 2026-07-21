import { describe, expect, it } from 'vitest';

import { getOfflineReviewTone } from './mock-admin-payments';

describe('getOfflineReviewTone', () => {
  it('maps every documented review outcome consistently', () => {
    expect(getOfflineReviewTone('در انتظار بررسی')).toBe('warning');
    expect(getOfflineReviewTone('تأییدشده')).toBe('success');
    expect(getOfflineReviewTone('ردشده')).toBe('danger');
  });
});
