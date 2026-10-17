import type { DriverListItem } from './admin-drivers-api';

export type DriverSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

export function sortAdminDrivers(drivers: DriverListItem[], sort: DriverSort): DriverListItem[] {
  return [...drivers].sort((left, right) => {
    if (sort === 'name-asc' || sort === 'name-desc') {
      const comparison =
        left.lastName.localeCompare(right.lastName, 'fa') ||
        left.firstName.localeCompare(right.firstName, 'fa');
      return sort === 'name-asc' ? comparison : -comparison;
    }
    const comparison = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return sort === 'newest' ? comparison : -comparison;
  });
}
