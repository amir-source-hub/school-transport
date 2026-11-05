import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from './page';
import { getManagerInfo, getManagerStudents } from '@/features/manager/manager-api';

vi.mock('@/features/manager/manager-api', () => ({
  getManagerInfo: vi.fn(),
  getManagerStudents: vi.fn(),
}));
vi.mock('@/features/manager/student-filters', () => ({ ManagerStudentFilters: () => null }));

describe('manager student pagination', () => {
  it('requests the selected page and preserves filters in the next link', async () => {
    vi.mocked(getManagerStudents).mockResolvedValue({ items: [], total: 60 });
    vi.mocked(getManagerInfo).mockResolvedValue({ schools: [], primarySchoolId: null } as never);
    render(await Page({ searchParams: Promise.resolve({ page: '2', query: 'موسوی' }) }));
    expect(getManagerStudents).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    expect(screen.getByRole('link', { name: 'صفحه بعد' })).toHaveAttribute('href', expect.stringContaining('page=3'));
    expect(screen.getByRole('link', { name: 'صفحه بعد' })).toHaveAttribute('href', expect.stringContaining('query=%D9%85%D9%88%D8%B3%D9%88%DB%8C'));
  });
});
