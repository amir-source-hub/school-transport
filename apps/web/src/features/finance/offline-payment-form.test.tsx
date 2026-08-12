import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflinePaymentForm } from './offline-payment-form';

const api = vi.hoisted(() => ({
  getOfflineDestination: vi.fn(),
  submitOfflinePayment: vi.fn(),
  authorizeReceiptUpload: vi.fn(),
  completeReceiptUpload: vi.fn(),
}));
vi.mock('./payments-api', () => api);
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

class UploadRequest {
  upload: {
    onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void;
  } = {};
  status = 200;
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  open() {}
  setRequestHeader() {}
  send() {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 10 });
    this.onload?.();
  }
  abort() {
    this.onabort?.();
  }
}

describe('OfflinePaymentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getOfflineDestination.mockResolvedValue({
      id: 'd1',
      version: 1,
      accountOwner: 'شرکت',
      bankName: 'بانک',
      cardNumber: '6037991234567890',
      iban: null,
      accountNumber: '123456789001',
      instructions: 'رسید را ثبت کنید.',
    });
    api.submitOfflinePayment.mockResolvedValue('submission-1');
    api.authorizeReceiptUpload.mockResolvedValue('https://storage.example/upload');
    api.completeReceiptUpload.mockResolvedValue(undefined);
    vi.stubGlobal('XMLHttpRequest', UploadRequest);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:receipt'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('shows the central destination and uploads required receipt evidence before completion', async () => {
    const user = userEvent.setup();
    render(
      <OfflinePaymentForm items={[{ id: 'item-1', label: 'پیش‌پرداخت — ۴٬۹۹۷٬۸۰۰ تومان' }]} />,
    );
    expect(await screen.findByText('6037991234567890')).toBeInTheDocument();
    expect(screen.getByText('123456789001')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('سال'), { target: { value: '1405' } });
    fireEvent.change(screen.getByLabelText('ماه'), { target: { value: '05' } });
    fireEvent.change(screen.getByLabelText('روز'), { target: { value: '18' } });
    await user.type(screen.getByLabelText('شماره پیگیری بانکی'), '123456');
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    await user.upload(screen.getByLabelText('تصویر رسید (JPEG یا PNG)'), file);
    expect(screen.getByAltText('پیش‌نمایش رسید پرداخت')).toBeInTheDocument();
    fireEvent.submit(
      screen.getByRole('button', { name: 'ارسال رسید برای بررسی مدیر' }).closest('form')!,
    );
    await waitFor(() =>
      expect(api.completeReceiptUpload).toHaveBeenCalledWith(
        'submission-1',
        'panel',
        expect.any(AbortSignal),
      ),
    );
    expect(api.authorizeReceiptUpload).toHaveBeenCalledWith(
      'submission-1',
      file,
      'panel',
      expect.any(AbortSignal),
    );
  });
});
