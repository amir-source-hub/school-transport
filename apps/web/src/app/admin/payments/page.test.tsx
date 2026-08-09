import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminPaymentsPage from './page';
import {
  getAdminOfflineDestination,
  getAdminOfflineSubmissions,
  getAdminPayments,
} from '@/features/admin-payments/admin-payments-api';

vi.mock('@/features/admin-payments/admin-payments-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/admin-payments/admin-payments-api')>();
  return {
    ...actual,
    getAdminPayments: vi.fn(),
    getAdminOfflineDestination: vi.fn(),
    getAdminOfflineSubmissions: vi.fn(),
  };
});
vi.mock('@/features/admin-payments/offline-destination-form', () => ({
  OfflineDestinationForm: () => <div aria-label="فرم مقصد" />,
}));
vi.mock('@/features/admin-payments/payment-actions', () => ({
  ApprovePaymentDialog: () => <button>تأیید رسید</button>,
  RejectPaymentDialog: () => <button>رد رسید</button>,
  ReceiptPreviewDialog: () => <button>مشاهده رسید</button>,
  ConfigureInstallmentsDialog: () => <button>اقساط</button>,
}));

describe('admin offline receipt review queue', () => {
  it('passes validated page filters and renders context/actions for pending receipts', async () => {
    vi.mocked(getAdminPayments).mockResolvedValue({ payments: [] });
    vi.mocked(getAdminOfflineDestination).mockResolvedValue(null);
    vi.mocked(getAdminOfflineSubmissions).mockResolvedValue({
      total: 21,
      page: 2,
      pageSize: 20,
      items: [
        {
          id: 'submission-1',
          status: 'PENDING_REVIEW',
          version: 3,
          submittedAmount: 2_000_000,
          expectedAmount: 2_000_000,
          paidAt: new Date('2026-08-08T10:00:00Z'),
          submittedAt: new Date('2026-08-08T11:00:00Z'),
          referenceNumber: 'REF-123',
          payerName: null,
          sourceCardLastFour: null,
          rejectionReason: null,
          destinationSnapshot: {
            version: 2,
            bankName: 'بانک آزمون',
            accountOwner: 'شرکت آزمون',
            cardNumber: '1111222233334444',
          },
          itemType: 'PREPAYMENT',
          sequenceNumber: 0,
          dueDate: null,
          studentId: 'student-1',
          studentName: 'علی احمدی',
          familyName: 'رضا احمدی',
        },
      ],
    });

    render(
      await AdminPaymentsPage({
        searchParams: Promise.resolve({
          receiptStatus: 'PENDING_REVIEW',
          itemType: 'PREPAYMENT',
          receiptPage: '2',
        }),
      }),
    );

    expect(getAdminOfflineSubmissions).toHaveBeenCalledWith({
      status: 'PENDING_REVIEW',
      itemType: 'PREPAYMENT',
      page: 2,
      pageSize: 20,
    });
    expect(screen.getByText('علی احمدی')).toBeInTheDocument();
    expect(screen.getByText('خانواده رضا احمدی')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مشاهده رسید' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'تأیید رسید' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'رد رسید' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'قبلی' })).toHaveAttribute(
      'href',
      expect.stringContaining('receiptStatus=PENDING_REVIEW'),
    );
  });
});
