import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ManagerReportButtons } from './manager-report-buttons';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-client', () => ({ apiRequest: request }));

it('generates a real Excel workbook from all API pages', async () => {
  request
    .mockResolvedValueOnce({
      data: [{ firstName: 'آزمایش', lastName: 'گزارش' }],
      pagination: { totalItems: 2 },
    })
    .mockResolvedValueOnce({
      data: [{ firstName: 'دانش‌آموز', lastName: 'دوم' }],
      pagination: { totalItems: 2 },
    });
  const createUrl = vi.fn((blob: Blob) => {
    expect(blob.size).toBeGreaterThan(0);
    return 'blob:report';
  });
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createUrl;
      static revokeObjectURL = vi.fn();
    },
  );
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    render(<ManagerReportButtons schoolName="مدرسه آزمایش" username="مدیر" />);
    fireEvent.click(screen.getByRole('button', { name: 'گزارش دانش‌آموزان' }));
    await waitFor(() => expect(click).toHaveBeenCalled(), { timeout: 10000 });
    expect(request).toHaveBeenNthCalledWith(2, '/manager/students?page=2&pageSize=100');
    const blob = createUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(blob.size).toBeGreaterThan(1000);
  } finally {
    vi.unstubAllGlobals();
  }
});
