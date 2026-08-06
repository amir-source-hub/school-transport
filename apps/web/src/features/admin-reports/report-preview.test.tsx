import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportPreviewPanel } from './report-preview';

const getReportPreview = vi.hoisted(() => vi.fn());
vi.mock('./report-preview-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./report-preview-api')>();
  return { ...original, getReportPreview };
});

describe('ReportPreviewPanel', () => {
  it('shows a bounded responsive preview and aggregate total after loading', async () => {
    getReportPreview.mockResolvedValue({
      section: 'payments',
      columns: [
        { key: 'studentName', label: 'دانش‌آموز' },
        { key: 'amount', label: 'مبلغ مورد انتظار (ریال)', kind: 'money' },
      ],
      rows: [{ studentName: 'سارا احمدی', amount: 4_000_000 }],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
      totals: { amount: 4_000_000 },
    });

    render(<ReportPreviewPanel />);

    expect(screen.getByRole('status', { name: 'در حال دریافت پیش‌نمایش' })).toBeInTheDocument();
    expect(await screen.findAllByText('سارا احمدی')).toHaveLength(2);
    expect(screen.getByText(/جمع مبلغ مورد انتظار/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'جدول پیش‌نمایش گزارش' })).toBeInTheDocument();
  });
});

