import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../../config/config.service';
import type { DatabaseService } from '../../database/database.service';
import type { S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { PaymentsService } from './payments.service';

function selectQuery(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
  });
  return chain;
}

function createHarness(
  createdRows: unknown[] = [{ id: 'submission-1' }],
  replayRows: unknown[] = [],
) {
  const insertedValues: unknown[] = [];
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      insertedValues.push(values);
      return {
        onConflictDoNothing: vi.fn(() => ({ returning: vi.fn(async () => createdRows) })),
      };
    }),
  }));
  const select = vi.fn(() => selectQuery(replayRows));
  const service = new PaymentsService(
    { db: { insert, select } } as unknown as DatabaseService,
    {} as never,
    {} as never,
  );
  vi.spyOn(service as never, 'getOwnedScheduleItem' as never).mockResolvedValue({
    id: 'item-1',
    paymentPlanId: 'plan-1',
    itemStatus: 'PENDING',
    amount: 2_000_000,
  } as never);
  vi.spyOn(service, 'getActiveOfflineDestination').mockResolvedValue({
    id: 'destination-1',
    version: 2,
    accountOwner: 'شرکت آزمون',
    bankName: 'بانک آزمون',
    cardNumber: '1111222233334444',
    iban: null,
    accountNumber: null,
  } as never);
  return { service, insertedValues };
}

const valid = {
  paidAt: '2026-08-08T10:00:00.000Z',
  referenceNumber: 'REF-123',
  sourceCardLastFour: '1234',
  idempotencyKey: 'offline-submit-key-1',
};

describe('offline payment payer submission', () => {
  it.each(['PREPAYMENT', 'INSTALLMENT'])(
    'binds an owned %s item to server-derived exact amount and destination snapshot',
    async (_itemType) => {
      const { service, insertedValues } = createHarness();
      const submissionId = await service.createOfflineSubmission('item-1', 'user-1', valid);
      expect(submissionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(insertedValues[0]).toMatchObject({
        paymentScheduleItemId: 'item-1',
        id: submissionId,
        paymentPlanId: 'plan-1',
        payerUserId: 'user-1',
        submittedAmount: 2_000_000,
        destinationId: 'destination-1',
        destinationSnapshot: expect.objectContaining({ version: 2, bankName: 'بانک آزمون' }),
        status: 'DRAFT',
        idempotencyKey: 'offline-submit-key-1',
      });
    },
  );

  it.each([
    [{ ...valid, paidAt: 'not-a-date' }, 'VALIDATION_ERROR'],
    [{ ...valid, paidAt: '2999-01-01T00:00:00.000Z' }, 'VALIDATION_ERROR'],
    [{ ...valid, referenceNumber: '   ' }, 'VALIDATION_ERROR'],
    [{ ...valid, sourceCardLastFour: '12x4' }, 'VALIDATION_ERROR'],
  ])('rejects invalid payment metadata before insertion', async (input, code) => {
    const { service, insertedValues } = createHarness();
    await expect(service.createOfflineSubmission('item-1', 'user-1', input)).rejects.toMatchObject({
      code,
    });
    expect(insertedValues).toEqual([]);
  });

  it('returns the same owned submission for an identical idempotent replay', async () => {
    const { service } = createHarness(
      [],
      [{ id: 'submission-existing', paymentScheduleItemId: 'item-1' }],
    );
    await expect(service.createOfflineSubmission('item-1', 'user-1', valid)).resolves.toBe(
      'submission-existing',
    );
  });

  it('rejects an idempotency-key collision bound to another schedule item', async () => {
    const { service } = createHarness(
      [],
      [{ id: 'submission-existing', paymentScheduleItemId: 'item-other' }],
    );
    await expect(service.createOfflineSubmission('item-1', 'user-1', valid)).rejects.toMatchObject({
      code: 'OFFLINE_PAYMENT_PENDING',
    });
  });
});

describe('admin payment on behalf', () => {
  it('creates a family-owned draft for either prepayment or installment', async () => {
    const service = new PaymentsService({ db: {} } as DatabaseService, {} as never, {} as never);
    vi.spyOn(service as never, 'getScheduleItemOwner' as never).mockResolvedValue('family-1' as never);
    const create = vi
      .spyOn(service, 'createOfflineSubmission')
      .mockResolvedValue('submission-1');

    await expect(
      service.createOfflineSubmissionForAdmin('item-1', 'admin-1', valid),
    ).resolves.toEqual({ submissionId: 'submission-1' });
    expect(create).toHaveBeenCalledWith('item-1', 'family-1', valid);
  });

  it('does not approve an admin payment until its receipt completes validation', async () => {
    const service = new PaymentsService({ db: {} } as DatabaseService, {} as never, {} as never);
    vi.spyOn(service as never, 'getSubmissionOwner' as never).mockResolvedValue('family-1' as never);
    const complete = vi
      .spyOn(service, 'completeReceiptUpload')
      .mockResolvedValue({ version: 3 } as never);
    const approve = vi.spyOn(service, 'approveOfflinePayment').mockResolvedValue({} as never);

    await service.completeAndApproveReceiptForAdmin('submission-1', 'admin-1');

    expect(complete).toHaveBeenCalledWith('submission-1', 'family-1');
    expect(approve).toHaveBeenCalledWith('submission-1', 'admin-1', 3);
  });
});

describe('offline receipt privacy and tamper checks', () => {
  it('returns the same not-found result for a foreign or nonexistent submission', async () => {
    const storage = { presignGet: vi.fn() } as unknown as S3Storage;
    const service = new PaymentsService(
      { db: { select: vi.fn(() => selectQuery([])) } } as unknown as DatabaseService,
      {} as never,
      {} as never,
      undefined,
      { studentPhotoViewUrlTtlSeconds: 300 } as ConfigService,
      storage,
    );
    await expect(service.getReceiptView('foreign-submission', 'user-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
    expect(storage.presignGet).not.toHaveBeenCalled();
  });

  it('issues only the configured short-lived URL for an owned canonical receipt', async () => {
    const storage = {
      presignGet: vi.fn(() => 'https://signed.invalid/view'),
    } as unknown as S3Storage;
    const service = new PaymentsService(
      {
        db: {
          select: vi.fn(() =>
            selectQuery([
              {
                id: 'submission-1',
                payerUserId: 'user-1',
                status: 'PENDING_REVIEW',
                receiptObjectKey: 'payment-receipts/canonical/receipt.jpg',
              },
            ]),
          ),
        },
      } as unknown as DatabaseService,
      {} as never,
      {} as never,
      undefined,
      { studentPhotoViewUrlTtlSeconds: 300 } as ConfigService,
      storage,
    );
    await expect(service.getReceiptView('submission-1', 'user-1')).resolves.toEqual({
      viewUrl: 'https://signed.invalid/view',
      expiresInSeconds: 300,
    });
    expect(storage.presignGet).toHaveBeenCalledWith('payment-receipts/canonical/receipt.jpg', 300);
  });

  it('rejects actual-versus-declared byte mismatch before reading or processing evidence', async () => {
    const storage = {
      headObject: vi.fn(async () => ({ size: 999 })),
      getObject: vi.fn(),
    } as unknown as S3Storage;
    const service = new PaymentsService(
      {
        db: {
          select: vi.fn(() =>
            selectQuery([
              {
                id: 'submission-1',
                payerUserId: 'user-1',
                status: 'DRAFT',
                receiptObjectKey: 'payment-receipts/raw/receipt.jpg',
                receiptSize: 1_000,
                receiptMime: 'image/jpeg',
              },
            ]),
          ),
        },
      } as unknown as DatabaseService,
      {} as never,
      {} as never,
      undefined,
      {
        studentPhotoMaxBytes: 25 * 1024 * 1024,
        studentPhotoMaxPixels: 12_500_000,
        studentPhotoMaxAxis: 8_000,
      } as ConfigService,
      storage,
    );
    await expect(service.completeReceiptUpload('submission-1', 'user-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(storage.getObject).not.toHaveBeenCalled();
  });
});
