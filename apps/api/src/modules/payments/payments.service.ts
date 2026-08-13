import { forwardRef, Inject, Injectable, Optional } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  paymentTransactions,
  paymentScheduleItems,
  paymentPlans,
  registrationPrices,
  serviceRegistrations,
  students,
  parents,
  offlinePaymentDestinations,
  offlinePaymentSubmissions,
} from '../../database/schemas';
import { eq, and, count, inArray, desc, max, ne } from 'drizzle-orm';
import { AppError, NotFoundError, ConflictError, ValidationError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { assertGatewayVerification, PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { createHash } from 'node:crypto';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import { ConfigService } from '../../config/config.service';
import { S3_CLIENT, S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { processReceiptImage } from './receipt-image-processor';

const onlinePaymentResult = {
  id: paymentTransactions.id,
  paymentPlanId: paymentTransactions.paymentPlanId,
  paymentScheduleItemId: paymentTransactions.paymentScheduleItemId,
  amount: paymentTransactions.amount,
  paymentMethod: paymentTransactions.paymentMethod,
  transactionStatus: paymentTransactions.transactionStatus,
  requestedAt: paymentTransactions.requestedAt,
};

export const ADMIN_PAYMENT_PLAN_LIST_LIMIT = 1_000;
export const FAMILY_PAYMENT_PLAN_LIST_LIMIT = 100;
export const PAYMENT_TRANSACTION_HISTORY_LIMIT = 500;

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly notifications: InAppNotificationService,
    @Optional() @Inject(AUDIT_PORT) private readonly audit?: AuditPort,
    @Optional()
    @Inject(forwardRef(() => ConfigService))
    private readonly config?: ConfigService,
    @Optional() @Inject(S3_CLIENT) private readonly storage?: S3Storage,
  ) {}

  async getActiveOfflineDestination(includeInactive = false) {
    const [destination] = await this.db.db
      .select()
      .from(offlinePaymentDestinations)
      .where(eq(offlinePaymentDestinations.isActive, true))
      .orderBy(desc(offlinePaymentDestinations.version))
      .limit(1);
    if (!destination && !includeInactive) {
      throw new AppError(
        'OFFLINE_DESTINATION_UNAVAILABLE',
        'Offline payment details are not configured.',
        503,
      );
    }
    return destination ?? null;
  }

  async configureOfflineDestination(
    adminId: string,
    input: {
      expectedVersion?: number;
      accountOwner: string;
      bankName: string;
      cardNumber: string;
      iban?: string;
      accountNumber?: string;
      instructions: string;
      confirmed: boolean;
    },
  ) {
    if (!input.confirmed) throw new ValidationError('Confirmation is required.');
    if (!/^\d{16}$/.test(input.cardNumber) || (input.iban && !/^IR\d{24}$/i.test(input.iban))) {
      throw new ValidationError('Card number or IBAN is invalid.');
    }
    return this.db.db.transaction(async (txn) => {
      const [current] = await txn
        .select()
        .from(offlinePaymentDestinations)
        .where(eq(offlinePaymentDestinations.isActive, true))
        .for('update')
        .limit(1);
      if (current && input.expectedVersion !== current.version) {
        throw new ConflictError(
          'STALE_PAYMENT_DESTINATION',
          'Payment destination changed. Refresh and confirm again.',
        );
      }
      if (!current && input.expectedVersion !== undefined) {
        throw new ConflictError(
          'STALE_PAYMENT_DESTINATION',
          'Payment destination changed. Refresh and confirm again.',
        );
      }
      const [{ value: highest }] = await txn
        .select({ value: max(offlinePaymentDestinations.version) })
        .from(offlinePaymentDestinations);
      if (current) {
        await txn
          .update(offlinePaymentDestinations)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(offlinePaymentDestinations.id, current.id));
      }
      const [created] = await txn
        .insert(offlinePaymentDestinations)
        .values({
          id: generateId(),
          version: Number(highest ?? 0) + 1,
          accountOwner: input.accountOwner.trim(),
          bankName: input.bankName.trim(),
          cardNumber: input.cardNumber,
          iban: input.iban?.toUpperCase() ?? null,
          accountNumber: input.accountNumber?.trim() ?? null,
          instructions: input.instructions.trim(),
          createdByAdminId: adminId,
        })
        .returning();
      await this.audit?.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'OFFLINE_DESTINATION_UPDATED',
        entityType: 'OFFLINE_PAYMENT_DESTINATION',
        entityId: created.id,
        previousValues: current ? { id: current.id, version: current.version } : undefined,
        newValues: {
          version: created.version,
          bankName: created.bankName,
          cardNumber: `************${created.cardNumber.slice(-4)}`,
        },
      });
      return created;
    });
  }

  private async getOwnedScheduleItem(scheduleItemId: string, userId: string) {
    const result = await this.db.db
      .select({ item: paymentScheduleItems })
      .from(paymentScheduleItems)
      .innerJoin(paymentPlans, eq(paymentPlans.id, paymentScheduleItems.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(and(eq(paymentScheduleItems.id, scheduleItemId), eq(students.userId, userId)))
      .limit(1);

    if (result.length === 0) throw new NotFoundError('Schedule item');
    return result[0].item;
  }

  private async getPaymentEventDetails(txId: string) {
    const [detail] = await this.db.db
      .select({
        amount: paymentTransactions.amount,
        verifiedAt: paymentTransactions.verifiedAt,
        requestedAt: paymentTransactions.requestedAt,
        itemType: paymentScheduleItems.itemType,
        sequenceNumber: paymentScheduleItems.sequenceNumber,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        userId: students.userId,
      })
      .from(paymentTransactions)
      .innerJoin(
        paymentScheduleItems,
        eq(paymentScheduleItems.id, paymentTransactions.paymentScheduleItemId),
      )
      .innerJoin(paymentPlans, eq(paymentPlans.id, paymentTransactions.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(paymentTransactions.id, txId))
      .limit(1);
    if (!detail) return null;
    const familyParents = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.userId, detail.userId));
    const parent = familyParents.find((item) => item.isPrimaryContact) ?? familyParents[0];
    const invoice =
      detail.itemType === 'PREPAYMENT'
        ? 'پیش‌پرداخت'
        : `قسط شماره ${detail.sequenceNumber.toLocaleString('fa-IR')}`;
    const parentName = parent ? `${parent.firstName} ${parent.lastName}` : 'خانواده';
    const studentName = `${detail.studentFirstName} ${detail.studentLastName}`;
    const amountToman = Math.round(detail.amount / 10).toLocaleString('fa-IR');
    const date = (detail.verifiedAt ?? detail.requestedAt).toLocaleString('fa-IR', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Tehran',
    });
    return {
      userId: detail.userId,
      message: `${parentName}، ${invoice} دانش‌آموز ${studentName} را به مبلغ ${amountToman} تومان در تاریخ ${date} پرداخت کرد.`,
    };
  }

  async startOnlinePayment(scheduleItemId: string, userId: string, idempotencyKey: string) {
    if (this.gateway.enabled === false) {
      throw new AppError(
        'PAYMENT_GATEWAY_UNAVAILABLE',
        'Online payment is not available. Use the offline payment workflow.',
        503,
      );
    }
    const key = idempotencyKey.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key)) {
      throw new ValidationError(
        'Idempotency-Key must be 8 to 128 characters using letters, numbers, dot, underscore, colon, or hyphen.',
      );
    }
    const item = await this.getOwnedScheduleItem(scheduleItemId, userId);
    if (item.itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'This item has already been paid.');
    }

    const fingerprint = createHash('sha256')
      .update(`${userId}\0ONLINE_GATEWAY\0${scheduleItemId}\0${item.amount}`)
      .digest('hex');
    return this.db.db.transaction(async (txn) => {
      const [inserted] = await txn
        .insert(paymentTransactions)
        .values({
          id: generateId(),
          paymentPlanId: item.paymentPlanId,
          paymentScheduleItemId: scheduleItemId,
          userId,
          amount: item.amount,
          paymentMethod: 'ONLINE_GATEWAY',
          idempotencyKey: key,
          idempotencyFingerprint: fingerprint,
          transactionStatus: 'CREATED',
        })
        .onConflictDoNothing()
        .returning(onlinePaymentResult);
      if (inserted) return inserted;

      const [existing] = await txn
        .select({
          ...onlinePaymentResult,
          idempotencyFingerprint: paymentTransactions.idempotencyFingerprint,
        })
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.userId, userId),
            eq(paymentTransactions.paymentMethod, 'ONLINE_GATEWAY'),
            eq(paymentTransactions.idempotencyKey, key),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new ConflictError(
          'IDEMPOTENCY_CONFLICT',
          'The payment request conflicts with an existing operation.',
        );
      }
      const legacyMatch =
        existing.idempotencyFingerprint === null &&
        existing.paymentScheduleItemId === scheduleItemId &&
        existing.amount === item.amount;
      if (existing.idempotencyFingerprint !== fingerprint && !legacyMatch) {
        throw new ConflictError(
          'IDEMPOTENCY_CONFLICT',
          'This idempotency key was already used for a different payment request.',
        );
      }
      return {
        id: existing.id,
        paymentPlanId: existing.paymentPlanId,
        paymentScheduleItemId: existing.paymentScheduleItemId,
        amount: existing.amount,
        paymentMethod: existing.paymentMethod,
        transactionStatus: existing.transactionStatus,
        requestedAt: existing.requestedAt,
      };
    });
  }

  async verifyOnlinePayment(txId: string, userId: string, gatewayAuthority: string) {
    if (this.gateway.enabled === false) {
      throw new AppError(
        'PAYMENT_GATEWAY_UNAVAILABLE',
        'Online payment is not available. Use the offline payment workflow.',
        503,
      );
    }
    const tx = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(and(eq(paymentTransactions.id, txId), eq(paymentTransactions.userId, userId)))
      .limit(1);
    if (tx.length === 0) throw new NotFoundError('Transaction');

    if (tx[0].transactionStatus === 'SUCCEEDED') {
      return tx[0];
    }

    const gatewayResult = await this.gateway.verify({
      authority: gatewayAuthority,
      amount: tx[0].amount,
    });
    const gatewayTransactionId = assertGatewayVerification(tx[0].amount, gatewayResult);

    const result = await this.db.db.transaction(async (txn) => {
      const item = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId))
        .for('update')
        .limit(1);

      if (item[0].itemStatus === 'PAID') {
        throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already paid.');
      }

      await txn
        .update(paymentTransactions)
        .set({
          transactionStatus: 'SUCCEEDED',
          gatewayTransactionId,
          verifiedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txId));

      await txn
        .update(paymentScheduleItems)
        .set({
          itemStatus: 'PAID',
          paidAmount: tx[0].amount,
          paidAt: new Date(),
        })
        .where(eq(paymentScheduleItems.id, tx[0].paymentScheduleItemId));

      const planItems = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.paymentPlanId, tx[0].paymentPlanId));

      const allPaid = planItems.length > 0 && planItems.every((i) => i.itemStatus === 'PAID');
      const prepaid = planItems.some((i) => i.itemType === 'PREPAYMENT' && i.itemStatus === 'PAID');

      if (prepaid) {
        await txn
          .update(paymentPlans)
          .set({
            planStatus: allPaid ? 'COMPLETED' : 'ACTIVE',
            activatedAt: new Date(),
            completedAt: allPaid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(paymentPlans.id, tx[0].paymentPlanId));
        const [registration] = await txn
          .select({ id: serviceRegistrations.id })
          .from(paymentPlans)
          .innerJoin(
            registrationPrices,
            eq(registrationPrices.id, paymentPlans.registrationPriceId),
          )
          .innerJoin(
            serviceRegistrations,
            eq(serviceRegistrations.id, registrationPrices.registrationId),
          )
          .where(eq(paymentPlans.id, tx[0].paymentPlanId))
          .limit(1);
        if (registration) {
          await txn
            .update(serviceRegistrations)
            .set({ registrationStatus: 'ENROLLED', updatedAt: new Date() })
            .where(eq(serviceRegistrations.id, registration.id));
        }
      }

      await this.notifications.enqueueInTransaction(txn, {
        eventId: `PAYMENT_SUCCEEDED:${txId}:${userId}`,
        userId,
        notificationType: 'PAYMENT_SUCCEEDED',
        title: 'پرداخت با موفقیت انجام شد',
        message: `پرداخت ${tx[0].amount.toLocaleString('fa-IR')} ریال با موفقیت ثبت شد.`,
        relatedEntityType: 'PAYMENT',
        relatedEntityId: txId,
      });

      return txn
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, txId))
        .limit(1)
        .then((r) => r[0]);
    });
    return result;
  }

  async createOfflineSubmission(
    scheduleItemId: string,
    userId: string,
    data: {
      paidAt: string;
      referenceNumber: string;
      description?: string;
      payerName?: string;
      sourceCardLastFour?: string;
      idempotencyKey: string;
    },
  ) {
    const item = await this.getOwnedScheduleItem(scheduleItemId, userId);
    if (item.itemStatus === 'PAID') {
      throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Already paid.');
    }
    const destination = await this.getActiveOfflineDestination();
    const paidAt = new Date(data.paidAt);
    if (Number.isNaN(paidAt.getTime())) throw new ValidationError('تاریخ پرداخت معتبر نیست.');
    if (paidAt > new Date()) throw new ValidationError('تاریخ پرداخت نمی‌تواند در آینده باشد.');
    if (!data.referenceNumber.trim())
      throw new ValidationError('شماره پیگیری یا مرجع پرداخت الزامی است.');
    if (data.sourceCardLastFour && !/^\d{4}$/.test(data.sourceCardLastFour)) {
      throw new ValidationError('چهار رقم آخر کارت مبدأ باید دقیقاً چهار رقم باشد.');
    }
    const id = generateId();
    const [created] = await this.db.db
      .insert(offlinePaymentSubmissions)
      .values({
        id,
        paymentPlanId: item.paymentPlanId,
        paymentScheduleItemId: scheduleItemId,
        payerUserId: userId,
        destinationId: destination.id,
        destinationSnapshot: {
          version: destination.version,
          accountOwner: destination.accountOwner,
          bankName: destination.bankName,
          cardNumber: destination.cardNumber,
          iban: destination.iban,
          accountNumber: destination.accountNumber,
        },
        submittedAmount: item.amount,
        paidAt,
        payerName: data.payerName?.trim() ?? null,
        sourceCardLastFour: data.sourceCardLastFour ?? null,
        referenceNumber: data.referenceNumber.trim(),
        note: data.description?.trim() ?? null,
        idempotencyKey: data.idempotencyKey,
        status: 'DRAFT',
      })
      .onConflictDoNothing()
      .returning({ id: offlinePaymentSubmissions.id });
    if (!created) {
      const [replay] = await this.db.db
        .select({
          id: offlinePaymentSubmissions.id,
          paymentScheduleItemId: offlinePaymentSubmissions.paymentScheduleItemId,
        })
        .from(offlinePaymentSubmissions)
        .where(
          and(
            eq(offlinePaymentSubmissions.payerUserId, userId),
            eq(offlinePaymentSubmissions.idempotencyKey, data.idempotencyKey),
          ),
        )
        .limit(1);
      if (replay?.paymentScheduleItemId === scheduleItemId) return replay.id;
      throw new ConflictError(
        'OFFLINE_PAYMENT_PENDING',
        'An offline payment receipt is already awaiting admin review for this installment.',
      );
    }
    return id;
  }

  private async getScheduleItemOwner(scheduleItemId: string) {
    const [owner] = await this.db.db
      .select({ userId: students.userId })
      .from(paymentScheduleItems)
      .innerJoin(paymentPlans, eq(paymentPlans.id, paymentScheduleItems.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(paymentScheduleItems.id, scheduleItemId))
      .limit(1);
    if (!owner) throw new NotFoundError('Schedule item');
    return owner.userId;
  }

  async createOfflineSubmissionForAdmin(
    scheduleItemId: string,
    adminId: string,
    data: {
      paidAt: string;
      referenceNumber: string;
      description?: string;
      payerName?: string;
      sourceCardLastFour?: string;
      idempotencyKey: string;
    },
  ) {
    const userId = await this.getScheduleItemOwner(scheduleItemId);
    const submissionId = await this.createOfflineSubmission(scheduleItemId, userId, data);
    await this.audit?.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'ADMIN_OFFLINE_PAYMENT_DRAFT_CREATED',
      entityType: 'OFFLINE_PAYMENT_SUBMISSION',
      entityId: submissionId,
      newValues: { scheduleItemId, payerUserId: userId },
    });
    return { submissionId };
  }

  private async getSubmissionOwner(submissionId: string) {
    const [submission] = await this.db.db
      .select({ payerUserId: offlinePaymentSubmissions.payerUserId })
      .from(offlinePaymentSubmissions)
      .where(eq(offlinePaymentSubmissions.id, submissionId))
      .limit(1);
    if (!submission) throw new NotFoundError('Offline payment submission');
    return submission.payerUserId;
  }

  async authorizeReceiptUploadForAdmin(
    submissionId: string,
    input: { declaredMime: 'image/jpeg' | 'image/png'; declaredSize: number },
  ) {
    return this.authorizeReceiptUpload(
      submissionId,
      await this.getSubmissionOwner(submissionId),
      input,
    );
  }

  async completeAndApproveReceiptForAdmin(submissionId: string, adminId: string) {
    const completed = await this.completeReceiptUpload(
      submissionId,
      await this.getSubmissionOwner(submissionId),
    );
    return this.approveOfflinePayment(submissionId, adminId, completed.version);
  }

  async authorizeReceiptUpload(
    submissionId: string,
    userId: string,
    input: { declaredMime: 'image/jpeg' | 'image/png'; declaredSize: number },
  ) {
    if (!this.storage || !this.config)
      throw new AppError('RECEIPT_STORAGE_UNAVAILABLE', 'Receipt storage is not configured.', 503);
    const [submission] = await this.db.db
      .select()
      .from(offlinePaymentSubmissions)
      .where(
        and(
          eq(offlinePaymentSubmissions.id, submissionId),
          eq(offlinePaymentSubmissions.payerUserId, userId),
        ),
      )
      .limit(1);
    if (!submission) throw new NotFoundError('Offline payment submission');
    if (submission.status !== 'DRAFT')
      throw new ConflictError('RECEIPT_NOT_DRAFT', 'Only a draft receipt can be uploaded.');
    if (input.declaredSize > this.config.studentPhotoMaxBytes)
      throw new ValidationError('Receipt image is too large.');
    const extension = input.declaredMime === 'image/png' ? '.png' : '.jpg';
    const key = `payment-receipts/raw/${generateId()}${extension}`;
    const uploadUrl = this.storage.presignPut(
      key,
      input.declaredMime,
      this.config.studentPhotoUploadUrlTtlSeconds,
    );
    await this.db.db
      .update(offlinePaymentSubmissions)
      .set({
        receiptObjectKey: key,
        receiptMime: input.declaredMime,
        receiptSize: input.declaredSize,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(offlinePaymentSubmissions.id, submissionId),
          eq(offlinePaymentSubmissions.status, 'DRAFT'),
        ),
      );
    return {
      uploadUrl,
      expiresInSeconds: this.config.studentPhotoUploadUrlTtlSeconds,
      maxBytes: this.config.studentPhotoMaxBytes,
    };
  }

  async completeReceiptUpload(submissionId: string, userId: string) {
    if (!this.storage || !this.config)
      throw new AppError('RECEIPT_STORAGE_UNAVAILABLE', 'Receipt storage is not configured.', 503);
    const [submission] = await this.db.db
      .select()
      .from(offlinePaymentSubmissions)
      .where(
        and(
          eq(offlinePaymentSubmissions.id, submissionId),
          eq(offlinePaymentSubmissions.payerUserId, userId),
        ),
      )
      .limit(1);
    if (!submission) throw new NotFoundError('Offline payment submission');
    if (submission.status === 'PENDING_REVIEW') return submission;
    if (submission.status !== 'DRAFT' || !submission.receiptObjectKey)
      throw new ConflictError('RECEIPT_NOT_AUTHORIZED', 'Authorize and upload a receipt first.');
    const rawKey = submission.receiptObjectKey;
    const head = await this.storage.headObject(rawKey).catch(() => null);
    if (
      !head ||
      head.size !== submission.receiptSize ||
      head.size > this.config.studentPhotoMaxBytes
    ) {
      throw new ValidationError('Uploaded receipt size does not match the declared file.');
    }
    const raw = await this.storage.getObject(rawKey).catch(() => null);
    if (!raw) throw new AppError('RECEIPT_UPLOAD_MISSING', 'Receipt image could not be read.', 409);
    let processed;
    try {
      processed = await processReceiptImage(raw, {
        maxBytes: this.config.studentPhotoMaxBytes,
        maxPixels: this.config.studentPhotoMaxPixels,
        maxAxis: this.config.studentPhotoMaxAxis,
      });
      if (processed.sourceMime !== submission.receiptMime) throw new Error('MIME_MISMATCH');
    } catch {
      await this.storage.deleteObject(rawKey).catch(() => undefined);
      throw new ValidationError('Receipt must be a valid JPEG or PNG image.');
    }
    const canonicalKey = `payment-receipts/canonical/${generateId()}.jpg`;
    await this.storage.putObject(canonicalKey, processed.canonical, processed.mime);
    let updated;
    try {
      [updated] = await this.db.db.transaction(async (txn) => {
        const [saved] = await txn
          .update(offlinePaymentSubmissions)
          .set({
            receiptObjectKey: canonicalKey,
            receiptMime: processed.mime,
            receiptSize: processed.size,
            receiptWidth: processed.width,
            receiptHeight: processed.height,
            receiptChecksum: processed.checksum,
            status: 'PENDING_REVIEW',
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(offlinePaymentSubmissions.id, submissionId),
              eq(offlinePaymentSubmissions.status, 'DRAFT'),
            ),
          )
          .returning();
        if (!saved)
          throw new ConflictError('RECEIPT_NOT_DRAFT', 'Receipt state changed while uploading.');
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `OFFLINE_PAYMENT_SUBMITTED:${submissionId}:${userId}`,
          userId,
          notificationType: 'OFFLINE_PAYMENT_SUBMITTED',
          title: 'رسید پرداخت ارسال شد',
          message: 'رسید شما برای بررسی مدیریت ثبت شد. ارسال رسید به معنی تأیید پرداخت نیست.',
          relatedEntityType: 'OFFLINE_PAYMENT_SUBMISSION',
          relatedEntityId: submissionId,
        });
        return [saved];
      });
    } catch (error) {
      await this.storage.deleteObject(canonicalKey).catch(() => undefined);
      throw error;
    }
    await this.storage.deleteObject(rawKey).catch(() => undefined);
    return updated;
  }

  async getReceiptView(submissionId: string, actorId: string, admin = false) {
    if (!this.storage || !this.config)
      throw new AppError('RECEIPT_STORAGE_UNAVAILABLE', 'Receipt storage is not configured.', 503);
    const filters = [eq(offlinePaymentSubmissions.id, submissionId)];
    if (!admin) filters.push(eq(offlinePaymentSubmissions.payerUserId, actorId));
    const [submission] = await this.db.db
      .select()
      .from(offlinePaymentSubmissions)
      .where(and(...filters))
      .limit(1);
    if (!submission?.receiptObjectKey || submission.status === 'DRAFT')
      throw new NotFoundError('Receipt');
    return {
      viewUrl: this.storage.presignGet(
        submission.receiptObjectKey,
        this.config.studentPhotoViewUrlTtlSeconds,
      ),
      expiresInSeconds: this.config.studentPhotoViewUrlTtlSeconds,
    };
  }

  async approveOfflinePayment(submissionId: string, adminId: string, version: number) {
    const result = await this.db.db.transaction(async (txn) => {
      const [submission] = await txn
        .select()
        .from(offlinePaymentSubmissions)
        .where(eq(offlinePaymentSubmissions.id, submissionId))
        .for('update')
        .limit(1);
      if (!submission) throw new NotFoundError('Offline payment submission');
      if (submission.status !== 'PENDING_REVIEW' || submission.version !== version) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'این رسید قبلاً بررسی شده یا وضعیت آن تغییر کرده است. صفحه را تازه کنید.',
        );
      }
      const [item] = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.id, submission.paymentScheduleItemId))
        .for('update')
        .limit(1);
      if (!item) throw new NotFoundError('Schedule item');
      if (item.itemStatus === 'PAID') {
        throw new ConflictError('PAYMENT_ALREADY_COMPLETED', 'Schedule item already paid.');
      }
      const [lockedPlan] = await txn
        .select({ id: paymentPlans.id })
        .from(paymentPlans)
        .where(eq(paymentPlans.id, submission.paymentPlanId))
        .for('update')
        .limit(1);
      if (!lockedPlan) throw new NotFoundError('Payment plan');
      if (submission.submittedAmount !== item.amount)
        throw new ConflictError(
          'OFFLINE_PAYMENT_AMOUNT_MISMATCH',
          'Submitted amount does not match the schedule item.',
        );
      const transactionId = generateId();
      await txn.insert(paymentTransactions).values({
        id: transactionId,
        paymentPlanId: submission.paymentPlanId,
        paymentScheduleItemId: submission.paymentScheduleItemId,
        userId: submission.payerUserId,
        amount: submission.submittedAmount,
        paymentMethod: 'OFFLINE_RECEIPT',
        transactionStatus: 'SUCCEEDED',
        requestedAt: submission.paidAt,
        verifiedAt: new Date(),
        recordedByAdminId: adminId,
      });
      const [approved] = await txn
        .update(offlinePaymentSubmissions)
        .set({
          status: 'APPROVED',
          version: version + 1,
          reviewerAdminId: adminId,
          reviewedAt: new Date(),
          transactionId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(offlinePaymentSubmissions.id, submissionId),
            eq(offlinePaymentSubmissions.status, 'PENDING_REVIEW'),
            eq(offlinePaymentSubmissions.version, version),
          ),
        )
        .returning();
      if (!approved)
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'وضعیت رسید هم‌زمان تغییر کرده است. صفحه را تازه کنید.',
        );
      await txn
        .update(paymentScheduleItems)
        .set({
          itemStatus: 'PAID',
          paidAmount: submission.submittedAmount,
          paidAt: new Date(),
        })
        .where(eq(paymentScheduleItems.id, submission.paymentScheduleItemId));

      const planItems = await txn
        .select()
        .from(paymentScheduleItems)
        .where(eq(paymentScheduleItems.paymentPlanId, submission.paymentPlanId));
      const prepaid = planItems.some(
        (scheduleItem) =>
          scheduleItem.itemType === 'PREPAYMENT' && scheduleItem.itemStatus === 'PAID',
      );
      const allPaid =
        planItems.length > 0 &&
        planItems.every((scheduleItem) => scheduleItem.itemStatus === 'PAID');

      if (prepaid) {
        await txn
          .update(paymentPlans)
          .set({
            planStatus: allPaid ? 'COMPLETED' : 'ACTIVE',
            activatedAt: new Date(),
            completedAt: allPaid ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(paymentPlans.id, submission.paymentPlanId));
        const [registration] = await txn
          .select({ id: serviceRegistrations.id })
          .from(paymentPlans)
          .innerJoin(
            registrationPrices,
            eq(registrationPrices.id, paymentPlans.registrationPriceId),
          )
          .innerJoin(
            serviceRegistrations,
            eq(serviceRegistrations.id, registrationPrices.registrationId),
          )
          .where(eq(paymentPlans.id, submission.paymentPlanId))
          .limit(1);
        if (registration) {
          await txn
            .update(serviceRegistrations)
            .set({ registrationStatus: 'ENROLLED', updatedAt: new Date() })
            .where(eq(serviceRegistrations.id, registration.id));
        }
      }

      await this.notifications.enqueueInTransaction(txn, {
        eventId: `PAYMENT_APPROVED:${submissionId}:${submission.payerUserId}`,
        userId: submission.payerUserId,
        notificationType: 'PAYMENT_APPROVED',
        title: 'پرداخت تأیید شد',
        message: 'وضعیت پرداخت شما توسط مدیریت تأیید شد. جزئیات در پنل قابل مشاهده است.',
        relatedEntityType: 'OFFLINE_PAYMENT_SUBMISSION',
        relatedEntityId: submissionId,
      });
      await this.audit?.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'OFFLINE_PAYMENT_APPROVED',
        entityType: 'OFFLINE_PAYMENT_SUBMISSION',
        entityId: submissionId,
        previousValues: { status: submission.status, version },
        newValues: { status: 'APPROVED', transactionId },
      });
      return approved;
    });
    return result;
  }

  async rejectOfflinePayment(
    submissionId: string,
    adminId: string,
    reason: string,
    version: number,
  ) {
    await this.db.db.transaction(async (txn) => {
      const [pending] = await txn
        .select()
        .from(offlinePaymentSubmissions)
        .where(eq(offlinePaymentSubmissions.id, submissionId))
        .for('update')
        .limit(1);
      if (!pending) throw new NotFoundError('Offline payment submission');
      if (pending.status !== 'PENDING_REVIEW' || pending.version !== version) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'This receipt is no longer pending at the reviewed version.',
        );
      }
      const [rejected] = await txn
        .update(offlinePaymentSubmissions)
        .set({
          status: 'REJECTED',
          version: version + 1,
          rejectionReason: reason.trim(),
          reviewerAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(offlinePaymentSubmissions.id, submissionId),
            eq(offlinePaymentSubmissions.status, 'PENDING_REVIEW'),
            eq(offlinePaymentSubmissions.version, version),
          ),
        )
        .returning();
      if (!rejected) {
        throw new ConflictError(
          'OFFLINE_PAYMENT_NOT_PENDING',
          'Only a pending offline payment can be rejected.',
        );
      }
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `PAYMENT_REJECTED:${submissionId}:${rejected.payerUserId}`,
        userId: rejected.payerUserId,
        notificationType: 'OFFLINE_PAYMENT_CORRECTION_REQUIRED',
        title: 'پرداخت تأیید نشد',
        message: 'رسید پرداخت نیاز به اصلاح دارد. دلیل امن در پنل قابل مشاهده است.',
        relatedEntityType: 'OFFLINE_PAYMENT_SUBMISSION',
        relatedEntityId: submissionId,
      });
      await this.audit?.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'OFFLINE_PAYMENT_REJECTED',
        entityType: 'OFFLINE_PAYMENT_SUBMISSION',
        entityId: submissionId,
        previousValues: { status: pending.status, version },
        newValues: { status: 'REJECTED', reason: reason.trim() },
      });
      return rejected;
    });

    return { rejected: true };
  }

  async listOfflineSubmissions(userId: string) {
    return this.db.db
      .select()
      .from(offlinePaymentSubmissions)
      .where(eq(offlinePaymentSubmissions.payerUserId, userId))
      .orderBy(desc(offlinePaymentSubmissions.createdAt), desc(offlinePaymentSubmissions.id))
      .limit(100);
  }

  async listOfflineSubmissionsForAdmin(
    query: {
      status?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
      itemType?: 'PREPAYMENT' | 'INSTALLMENT';
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
    const filters = [ne(offlinePaymentSubmissions.status, 'DRAFT')];
    if (query.status) filters.push(eq(offlinePaymentSubmissions.status, query.status));
    if (query.itemType) filters.push(eq(paymentScheduleItems.itemType, query.itemType));
    const where = and(...filters);
    const rows = await this.db.db
      .select({
        submission: offlinePaymentSubmissions,
        itemType: paymentScheduleItems.itemType,
        sequenceNumber: paymentScheduleItems.sequenceNumber,
        expectedAmount: paymentScheduleItems.amount,
        dueDate: paymentScheduleItems.dueDate,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(offlinePaymentSubmissions)
      .innerJoin(
        paymentScheduleItems,
        eq(paymentScheduleItems.id, offlinePaymentSubmissions.paymentScheduleItemId),
      )
      .innerJoin(paymentPlans, eq(paymentPlans.id, offlinePaymentSubmissions.paymentPlanId))
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(where)
      .orderBy(desc(offlinePaymentSubmissions.createdAt), desc(offlinePaymentSubmissions.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(offlinePaymentSubmissions)
      .innerJoin(
        paymentScheduleItems,
        eq(paymentScheduleItems.id, offlinePaymentSubmissions.paymentScheduleItemId),
      )
      .where(where);
    const payerIds = [...new Set(rows.map(({ submission }) => submission.payerUserId))];
    const familyRows = payerIds.length
      ? await this.db.db.select().from(parents).where(inArray(parents.userId, payerIds))
      : [];
    return {
      items: rows.map(({ submission, ...context }) => {
        const family =
          familyRows.find(
            (candidate) =>
              candidate.userId === submission.payerUserId && candidate.isPrimaryContact,
          ) ?? familyRows.find((candidate) => candidate.userId === submission.payerUserId);
        return {
          ...submission,
          ...context,
          studentName: `${context.studentFirstName} ${context.studentLastName}`,
          familyName: family ? `${family.firstName} ${family.lastName}` : '—',
        };
      }),
      total: Number(value),
      page,
      pageSize,
    };
  }

  async getPayments(userId: string) {
    return this.db.db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.userId, userId),
          eq(paymentTransactions.paymentMethod, 'MANUAL_ADMIN_ENTRY'),
        ),
      )
      .orderBy(desc(paymentTransactions.createdAt), desc(paymentTransactions.id))
      .limit(PAYMENT_TRANSACTION_HISTORY_LIMIT);
  }

  async getOverview(userId: string) {
    const plans = await this.db.db
      .select({
        plan: paymentPlans,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(eq(students.userId, userId))
      .orderBy(desc(paymentPlans.createdAt), desc(paymentPlans.id))
      .limit(FAMILY_PAYMENT_PLAN_LIST_LIMIT);

    return Promise.all(
      plans.map(async ({ plan, ...student }) => {
        const [items, transactions] = await Promise.all([
          this.db.db
            .select()
            .from(paymentScheduleItems)
            .where(eq(paymentScheduleItems.paymentPlanId, plan.id))
            .orderBy(paymentScheduleItems.sequenceNumber),
          this.db.db
            .select()
            .from(paymentTransactions)
            .where(eq(paymentTransactions.paymentPlanId, plan.id))
            .orderBy(desc(paymentTransactions.createdAt), desc(paymentTransactions.id))
            .limit(PAYMENT_TRANSACTION_HISTORY_LIMIT),
        ]);
        return { plan, ...student, items, transactions };
      }),
    );
  }

  async getAllForAdmin() {
    const plans = await this.db.db
      .select({
        plan: paymentPlans,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        userId: students.userId,
      })
      .from(paymentPlans)
      .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
      .innerJoin(
        serviceRegistrations,
        eq(serviceRegistrations.id, registrationPrices.registrationId),
      )
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .orderBy(desc(paymentPlans.createdAt), desc(paymentPlans.id))
      .limit(ADMIN_PAYMENT_PLAN_LIST_LIMIT);

    if (plans.length === 0) return [];

    const planIds = plans.map(({ plan }) => plan.id);
    const items = await this.db.db
      .select()
      .from(paymentScheduleItems)
      .where(inArray(paymentScheduleItems.paymentPlanId, planIds));
    const itemIds = items.map((item) => item.id);
    const transactions =
      itemIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(paymentTransactions)
            .where(inArray(paymentTransactions.paymentScheduleItemId, itemIds));
    const submissions =
      itemIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(offlinePaymentSubmissions)
            .where(inArray(offlinePaymentSubmissions.paymentScheduleItemId, itemIds));
    const parentRows = await this.db.db
      .select()
      .from(parents)
      .where(inArray(parents.userId, [...new Set(plans.map(({ userId }) => userId))]));

    return plans
      .map(({ plan, studentId, studentFirstName, studentLastName, userId }) => {
        const planItems = items
          .filter((item) => item.paymentPlanId === plan.id)
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        const prepayment = planItems.find((item) => item.itemType === 'PREPAYMENT');
        if (!prepayment) return null;
        const mapItem = (item: typeof paymentScheduleItems.$inferSelect) => {
          const itemSubmissions = submissions
            .filter((submission) => submission.paymentScheduleItemId === item.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const latestSubmission = itemSubmissions[0];
          const itemTransactions = transactions
            .filter((transaction) => transaction.paymentScheduleItemId === item.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const latestTransaction = itemTransactions[0];
          const review = latestSubmission
            ? {
                id: latestSubmission.id,
                version: latestSubmission.version,
                submittedAmount: latestSubmission.submittedAmount,
                reference: latestSubmission.referenceNumber,
                submittedAt: latestSubmission.submittedAt.toISOString(),
                paidAt: latestSubmission.paidAt.toISOString(),
                payerName: latestSubmission.payerName,
                sourceCardLastFour: latestSubmission.sourceCardLastFour,
                note: latestSubmission.note,
                rejectionReason: latestSubmission.rejectionReason,
                destinationSnapshot: latestSubmission.destinationSnapshot,
                previousAttempts: itemSubmissions.length - 1,
                status:
                  latestSubmission.status === 'APPROVED'
                    ? 'تأییدشده'
                    : latestSubmission.status === 'REJECTED'
                      ? 'ردشده'
                      : 'در انتظار بررسی',
              }
            : null;
          return {
            id: item.id,
            type: item.itemType,
            sequenceNumber: item.sequenceNumber,
            amount: item.amount,
            dueDate: item.dueDate?.toISOString() ?? null,
            paidAmount: item.paidAmount,
            paidAt: item.paidAt?.toISOString() ?? null,
            paid: item.itemStatus === 'PAID',
            transaction:
              review ??
              (latestTransaction
                ? {
                    id: latestTransaction.id,
                    version: 1,
                    submittedAmount: latestTransaction.amount,
                    reference: latestTransaction.gatewayTransactionId ?? '—',
                    submittedAt:
                      latestTransaction.verifiedAt?.toISOString() ??
                      latestTransaction.requestedAt.toISOString(),
                    status:
                      latestTransaction.transactionStatus === 'SUCCEEDED'
                        ? 'تأییدشده'
                        : latestTransaction.transactionStatus === 'FAILED'
                          ? 'ردشده'
                          : 'در انتظار بررسی',
                  }
                : null),
          };
        };
        const parent =
          parentRows.find((entry) => entry.userId === userId && entry.isPrimaryContact) ??
          parentRows.find((entry) => entry.userId === userId);
        return {
          studentId,
          planId: plan.id,
          planType: plan.planType,
          planStatus: plan.planStatus,
          planConfigured: planItems.some((item) => item.itemType === 'INSTALLMENT'),
          studentName: `${studentFirstName} ${studentLastName}`,
          familyName: parent ? `${parent.firstName} ${parent.lastName}` : '—',
          totalAmount: plan.totalAmount,
          prepayment: mapItem(prepayment),
          installments: planItems.filter((item) => item.itemType === 'INSTALLMENT').map(mapItem),
        };
      })
      .filter((account) => account !== null && account.prepayment.transaction !== null);
  }

  async configureInstallments(planId: string, items: { amount: number; dueDate: string }[]) {
    if (items.length < 1 || items.length > 12) {
      throw new ValidationError('Installment count must be between 1 and 12.');
    }
    const [plan] = await this.db.db
      .select()
      .from(paymentPlans)
      .where(eq(paymentPlans.id, planId))
      .limit(1);
    if (!plan) throw new NotFoundError('Payment plan', planId);

    const errors: Record<string, string[]> = {};
    const startDay = plan.createdAt.toISOString().slice(0, 10);
    let previousDay: string | null = null;
    items.forEach((item, index) => {
      const key = `items.${index}.dueDate`;
      const messages: string[] = [];
      if (!Number.isInteger(item.amount) || item.amount <= 0) {
        messages.push('مبلغ قسط باید عددی بزرگ‌تر از صفر باشد.');
      }
      const dueDate = new Date(item.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        messages.push('تاریخ این قسط معتبر نیست.');
      } else {
        const dueDay = dueDate.toISOString().slice(0, 10);
        if (previousDay !== null && dueDay <= previousDay) {
          messages.push('تاریخ این قسط باید پس از تاریخ قسط قبلی باشد و تکرار نشود.');
        }
        if (dueDay < startDay) {
          messages.push('تاریخ سررسید نمی‌تواند پیش از تاریخ شروع برنامه پرداخت باشد.');
        }
        previousDay = dueDay;
      }
      if (messages.length > 0) errors[key] = messages;
    });
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Installment dates are invalid.', errors);
    }

    const result = await this.db.db.transaction(async (txn) => {
      if (plan.planType === 'FULL' && items.length !== 1) {
        throw new ValidationError('Full payment requires exactly one remaining payment.');
      }
      const remaining = items.reduce((sum, item) => sum + item.amount, 0);
      const total = plan.prepaymentAmount + remaining;
      await txn
        .delete(paymentScheduleItems)
        .where(
          and(
            eq(paymentScheduleItems.paymentPlanId, planId),
            eq(paymentScheduleItems.itemType, 'INSTALLMENT'),
          ),
        );
      await txn.insert(paymentScheduleItems).values(
        items.map((item, index) => ({
          id: generateId(),
          paymentPlanId: planId,
          itemType: 'INSTALLMENT',
          sequenceNumber: index + 1,
          amount: item.amount,
          dueDate: new Date(item.dueDate),
        })),
      );
      await txn
        .update(paymentPlans)
        .set({
          planType: plan.planType === 'FULL' ? 'FULL' : 'ADMIN_CONFIGURED',
          totalAmount: total,
          remainingInstallmentAmount: remaining,
          installmentCount: items.length,
          updatedAt: new Date(),
        })
        .where(eq(paymentPlans.id, planId));
      const [owner] = await txn
        .select({ userId: students.userId })
        .from(paymentPlans)
        .innerJoin(registrationPrices, eq(registrationPrices.id, paymentPlans.registrationPriceId))
        .innerJoin(
          serviceRegistrations,
          eq(serviceRegistrations.id, registrationPrices.registrationId),
        )
        .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
        .where(eq(paymentPlans.id, planId))
        .limit(1);
      if (owner) {
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `PAYMENT_PLAN_READY:${planId}:${owner.userId}`,
          userId: owner.userId,
          notificationType: 'PAYMENT_PLAN_READY',
          title: 'برنامه پرداخت آماده است',
          message: 'برنامه پرداخت جدید ثبت شد. لطفاً مبالغ و تاریخ‌های سررسید را بررسی کنید.',
          relatedEntityType: 'PAYMENT_PLAN',
          relatedEntityId: planId,
        });
      }
      return { planId, totalAmount: total, installmentCount: items.length };
    });
    return result;
  }
}
