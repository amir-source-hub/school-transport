import { describe, expect, it } from 'vitest';
import type { DriverListItem } from './admin-drivers-api';
import { sortAdminDrivers } from './admin-driver-sort';

const drivers = [
  { id: 'old', firstName: 'بهرام', lastName: 'زارعی', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'new', firstName: 'آرمان', lastName: 'احمدی', createdAt: '2026-09-01T00:00:00Z' },
  { id: 'same', firstName: 'کیوان', lastName: 'احمدی', createdAt: '2026-05-01T00:00:00Z' },
] as DriverListItem[];

describe('sortAdminDrivers', () => {
  it('places newly enrolled drivers first by default', () => {
    expect(sortAdminDrivers(drivers, 'newest').map((driver) => driver.id)).toEqual(['new', 'same', 'old']);
  });

  it('supports enrollment-date and Persian-name ordering', () => {
    expect(sortAdminDrivers(drivers, 'oldest').map((driver) => driver.id)).toEqual(['old', 'same', 'new']);
    expect(sortAdminDrivers(drivers, 'name-asc').map((driver) => driver.id)).toEqual([
      'new',
      'same',
      'old',
    ]);
    expect(sortAdminDrivers(drivers, 'name-desc').map((driver) => driver.id)).toEqual(['old', 'same', 'new']);
  });
});
