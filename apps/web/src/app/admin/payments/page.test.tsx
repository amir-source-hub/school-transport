import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AdminPaymentsPage from './page';
import {
  getAdminOfflineDestination,
  getAdminOfflineSubmissions,
  getAdminPayments,
  getAdminOnlineTransactions,
  getPrepaymentSettings,
} from '@/features/admin-payments/admin-payments-api';

vi.mock('@/features/admin-payments/admin-payments-api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/admin-payments/admin-payments-api')>();
  return {
    ...actual,
    getAdminPayments: vi.fn(),
    getAdminOnlineTransactions: vi.fn(),
    getAdminOfflineDestination: vi.fn(),
    getAdminOfflineSubmissions: vi.fn(),
    getPrepaymentSettings: vi.fn(),
  };
});
vi.mock('@/features/admin-payments/offline-destination-form', () => ({
  OfflineDestinationForm: () => <div aria-label="فرم مقصد" />,
}));
vi.mock('@/features/admin-payments/prepayment-settings-form', () => ({
  PrepaymentSettingsForm: () => <div aria-label="فرم پیش‌پرداخت" />,
}));
vi.mock('@/features/admin-payments/payment-mode-form', () => ({
  PaymentModeForm: () => <div aria-label="روش پرداخت" />,
}));
vi.mock('@/components/navigation/persistent-query-form', () => ({
  PersistentQueryForm: ({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) => <form aria-label={ariaLabel}>{children}</form>,
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
    vi.mocked(getPrepaymentSettings).mockResolvedValue({ defaultPrepaymentAmount: 49_978_000, paymentMode: 'OFFLINE', version: 1, updatedAt: '2026-11-05T00:00:00.000Z' });
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

  it('shows verified online transactions with remaining balance and next due date', async () => {
    vi.mocked(getAdminPayments).mockResolvedValue({ payments: [] });
    vi.mocked(getPrepaymentSettings).mockResolvedValue({ defaultPrepaymentAmount: 49_978_000, paymentMode: 'ONLINE', version: 2, updatedAt: '2026-11-05T00:00:00.000Z' });
    vi.mocked(getAdminOfflineSubmissions).mockResolvedValue({ total: 0, page: 1, pageSize: 20, items: [] });
    vi.mocked(getAdminOnlineTransactions).mockResolvedValue({
      total: 1, page: 1, pageSize: 20,
      items: [{ id: 'tx-1', studentName: 'مریم رضایی', familyName: 'رضا رضایی', itemType: 'INSTALLMENT', sequenceNumber: 2,
        amount: 2_000_000, status: 'SUCCEEDED', requestedAt: '2026-11-10T09:00:00Z', verifiedAt: '2026-11-10T09:05:00Z', reference: '123456',
        planTotal: 10_000_000, planStatus: 'ACTIVE', paidAmount: 6_000_000, remainingAmount: 4_000_000,
        prepaymentPaid: true, paidCount: 2, remainingCount: 2, nextDueDate: '2026-12-01T00:00:00Z' }],
    });
    render(await AdminPaymentsPage({ searchParams: Promise.resolve({ view: 'online', onlineStatus: 'SUCCEEDED' }) }));
    expect(getAdminOnlineTransactions).toHaveBeenCalledWith(expect.objectContaining({ status: 'SUCCEEDED', page: 1 }));
    expect(screen.getByText('مریم رضایی')).toBeInTheDocument();
    expect(screen.getByText('۴٬۰۰۰٬۰۰۰ ریال')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
  });
});
