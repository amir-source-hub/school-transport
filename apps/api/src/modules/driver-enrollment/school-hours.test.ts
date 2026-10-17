import { describe, expect, it } from 'vitest';
import { schoolHours } from './school-hours';

const school = { openingTime: '07:00', closingTime: '12:00', closingTimes: ['12:00', '15:30'] };

describe('schoolHours', () => {
  it('uses opening for outbound', () => {
    expect(schoolHours(school, 'TO_SCHOOL')).toEqual({ scheduledStopTime: '07:00', scheduledReturnStopTime: null });
  });
  it('uses the latest closing time for inbound', () => {
    expect(schoolHours(school, 'FROM_SCHOOL')).toEqual({ scheduledStopTime: '15:30', scheduledReturnStopTime: null });
  });
  it('provides both school times for a round trip', () => {
    expect(schoolHours(school, 'ROUND_TRIP')).toEqual({ scheduledStopTime: '07:00', scheduledReturnStopTime: '15:30' });
  });
});
