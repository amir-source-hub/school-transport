import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { ConfigService } from '../../config/config.service';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { AUDIT_PORT, type AuditPort } from '../../common/audit.port';
import { DatabaseService } from '../../database/database.service';
import { schoolManagerAssignments, students, studentPhotoUploads } from '../../database/schemas';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { S3_CLIENT, type S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { assertStudentPhotoTransition, type StudentPhotoStatus } from './student-photo-lifecycle';
import { PhotoValidationError, type ProcessedPhoto } from './student-photo-processor';
import { processStudentPhotoIsolated } from './isolated-photo-processor';
import type {
  AdminPhotoListQueryDto,
  AuthorizePhotoUploadDto,
  RejectPhotoUploadDto,
} from './student-photo.dto';

const RAW_PREFIX = 'student-photos/raw/';
const CANONICAL_PREFIX = 'student-photos/canonical/';
const UPLOADED_STALL_MS = 6 * 60 * 60 * 1_000;
const RAW_RETENTION_MS = 24 * 60 * 60 * 1_000;
const CANONICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

function keyOfPrefix(prefix: string, extension: string): string {
  return `${prefix}${generateId()}${extension}`;
}

@Injectable()
export class StudentPhotosService {
  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(forwardRef(() => ConfigService)) private readonly config: ConfigService,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly notifications: InAppNotificationService,
    @Inject(S3_CLIENT) private readonly storage: S3Storage,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  private photoConfig() {
    return {
      maxBytes: this.config.studentPhotoMaxBytes,
      maxPixels: this.config.studentPhotoMaxPixels,
      maxAxis: this.config.studentPhotoMaxAxis,
      outputWidth: this.config.studentPhotoOutputWidth,
      outputHeight: this.config.studentPhotoOutputHeight,
      jpegQuality: this.config.studentPhotoJpegQuality,
    };
  }

  async authorizeUpload(userId: string, input: AuthorizePhotoUploadDto, ip?: string) {
    if (input.studentId) await this.assertOwnedStudent(userId, input.studentId);
    const now = new Date();
    const abandoned = await this.db.db
      .update(studentPhotoUploads)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where(
        and(
          eq(studentPhotoUploads.accountUserId, userId),
          eq(studentPhotoUploads.status, 'AUTHORIZED'),
          input.studentId
            ? eq(studentPhotoUploads.studentId, input.studentId)
            : isNull(studentPhotoUploads.studentId),
        ),
      )
      .returning({ rawKey: studentPhotoUploads.rawKey });
    await Promise.all(
      abandoned.map(({ rawKey }) => this.storage.deleteObject(rawKey).catch(() => undefined)),
    );
    const active = await this.db.db
      .select({ count: count() })
      .from(studentPhotoUploads)
      .where(
        and(
          eq(studentPhotoUploads.accountUserId, userId),
          inArray(studentPhotoUploads.status, [
            'AUTHORIZED',
            'UPLOADED',
            'VALIDATING',
            'PENDING_REVIEW',
          ]),
          or(
            ne(studentPhotoUploads.status, 'AUTHORIZED'),
            gt(studentPhotoUploads.uploadAuthorizationExpiry, now),
          ),
        ),
      );
    if (Number(active[0].count) >= this.config.studentPhotoMaxActiveUploads) {
      throw new ConflictError(
        'PHOTO_UPLOAD_LIMIT',
        'هم‌زمان چند عکس در حال بارگذاری دارید. ابتدا وضعیت عکس‌های قبلی را بررسی کنید.',
      );
    }
    if (input.declaredSize > this.config.studentPhotoMaxBytes) {
      throw new ValidationError('حجم فایل از حد مجاز بیشتر است. حداکثر ۵ مگابایت.', {
        declaredSize: ['حداکثر ۵ مگابایت مجاز است.'],
      });
    }
    const extension = input.declaredMime === 'image/png' ? '.png' : '.jpg';
    const rawKey = keyOfPrefix(RAW_PREFIX, extension);
    const ttl = this.config.studentPhotoUploadUrlTtlSeconds;
    const expiry = new Date(now.getTime() + ttl * 1_000);
    const uploadUrl = this.storage.presignPut(rawKey, input.declaredMime, ttl);

    const [saved] = await this.db.db
      .insert(studentPhotoUploads)
      .values({
        id: generateId(),
        accountUserId: userId,
        studentId: input.studentId ?? null,
        rawKey,
        declaredMime: input.declaredMime,
        declaredSize: input.declaredSize,
        status: 'AUTHORIZED',
        uploadAuthorizationExpiry: expiry,
      })
      .returning();
    await this.audit.record({
      actorType: 'PARENT',
      actorId: userId,
      action: 'STUDENT_PHOTO_UPLOAD_AUTHORIZED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: saved.id,
      newValues: { declaredMime: input.declaredMime, declaredSize: input.declaredSize },
      ipAddress: ip,
    });
    return {
      uploadId: saved.id,
      objectKey: rawKey,
      uploadUrl,
      expiresInSeconds: ttl,
      acceptedFormats: ['image/jpeg', 'image/png'],
      maxBytes: this.config.studentPhotoMaxBytes,
      status: saved.status,
    };
  }

  async completeUpload(userId: string, uploadId: string, ip?: string) {
    const [upload] = await this.db.db
      .select()
      .from(studentPhotoUploads)
      .where(eq(studentPhotoUploads.id, uploadId))
      .limit(1);
    if (!upload || upload.accountUserId !== userId) throw new NotFoundError('Student photo upload');
    if (upload.status === 'EXPIRED') {
      throw new AppError('PHOTO_UPLOAD_EXPIRED', 'زمان بارگذاری عکس به پایان رسیده است.', 410);
    }
    if (
      upload.status === 'VALIDATING' ||
      upload.status === 'PENDING_REVIEW' ||
      upload.status === 'APPROVED'
    ) {
      return this.toOwnerView(upload);
    }
    assertStudentPhotoTransition(upload.status as StudentPhotoStatus, 'UPLOADED');

    let head: { size: number; etag: string };
    try {
      head = await this.storage.headObject(upload.rawKey);
    } catch {
      throw new AppError(
        'PHOTO_UPLOAD_MISSING',
        'عکس به ذخیره‌گاه نرسیده است. دوباره بارگذاری کنید.',
        409,
      );
    }
    if (head.size > this.config.studentPhotoMaxBytes) {
      await this.markFailed(upload.id, 'TOO_LARGE', ip);
      throw new ValidationError('فایل بارگذاری‌شده از حد مجاز ۵ مگابایت بزرگ‌تر است.');
    }
    if (head.size !== upload.declaredSize) {
      await this.markFailed(upload.id, 'SIZE_MISMATCH', ip);
      await this.storage.deleteObject(upload.rawKey).catch(() => undefined);
      throw new ValidationError('اندازه فایل بارگذاری‌شده با اندازه اعلام‌شده مطابقت ندارد.');
    }

    let raw: Buffer;
    try {
      raw = await this.storage.getObject(upload.rawKey);
    } catch {
      throw new AppError(
        'PHOTO_UPLOAD_MISSING',
        'عکس قابل خواندن نیست. دوباره بارگذاری کنید.',
        409,
      );
    }
    if (raw.length !== head.size) {
      await this.markFailed(upload.id, 'SIZE_MISMATCH', ip);
      await this.storage.deleteObject(upload.rawKey).catch(() => undefined);
      throw new ValidationError('اندازه فایل خوانده‌شده از ذخیره‌گاه معتبر نیست.');
    }

    await this.db.db
      .update(studentPhotoUploads)
      .set({
        status: 'VALIDATING',
        uploadedAt: new Date(),
        validatingAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentPhotoUploads.id, upload.id));

    let processed: ProcessedPhoto;
    try {
      processed = await processStudentPhotoIsolated(raw, this.photoConfig());
    } catch (error) {
      const code =
        error instanceof PhotoValidationError ? error.rejectionCode : 'PROCESSING_FAILED';
      await this.markFailed(upload.id, code, ip);
      await this.storage.deleteObject(upload.rawKey).catch(() => undefined);
      throw new ValidationError('عکس بارگذاری‌شده معتبر نیست و در صف بررسی قرار نمی‌گیرد.');
    }

    const canonicalKey = keyOfPrefix(CANONICAL_PREFIX, '.jpg');
    try {
      await this.storage.putObject(canonicalKey, processed.canonical, 'image/jpeg');
    } catch {
      await this.markFailed(upload.id, 'STORAGE_UNAVAILABLE', ip);
      throw new AppError(
        'PHOTO_STORAGE_UNAVAILABLE',
        'ذخیره عکس پردازش‌شده ناموفق بود. دوباره تلاش کنید.',
        503,
      );
    }

    let updated: typeof studentPhotoUploads.$inferSelect | undefined;
    try {
      [updated] = await this.db.db
        .update(studentPhotoUploads)
        .set({
          status: 'PENDING_REVIEW',
          canonicalKey,
          actualMime: 'image/jpeg',
          actualSize: processed.actualSize,
          width: processed.width,
          height: processed.height,
          checksum: processed.checksum,
          pendingReviewAt: new Date(),
          version: sql`${studentPhotoUploads.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studentPhotoUploads.id, upload.id),
            eq(studentPhotoUploads.status, 'VALIDATING'),
            eq(studentPhotoUploads.version, upload.version),
          ),
        )
        .returning();
      if (!updated) throw new Error('Photo processing claim was lost.');
    } catch {
      // A client retry can overlap the original completion request after the direct PUT
      // reached storage. Never destroy the shared raw object or fail the row merely because
      // another request won the optimistic update. Remove only this request's unused output
      // and return the authoritative state so completion is idempotent.
      await this.storage.deleteObject(canonicalKey).catch(() => undefined);
      const [current] = await this.db.db
        .select()
        .from(studentPhotoUploads)
        .where(eq(studentPhotoUploads.id, upload.id))
        .limit(1);
      if (
        current &&
        current.accountUserId === userId &&
        ['VALIDATING', 'PENDING_REVIEW', 'APPROVED'].includes(current.status)
      ) {
        return this.toOwnerView(current);
      }
      throw new ConflictError(
        'PHOTO_PROCESSING_CONFLICT',
        'وضعیت عکس تغییر کرده است. وضعیت فعلی را دوباره دریافت کنید.',
      );
    }
    await this.storage.deleteObject(upload.rawKey).catch(() => undefined);
    await this.audit.record({
      actorType: 'PARENT',
      actorId: userId,
      action: 'STUDENT_PHOTO_UPLOADED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: upload.id,
      newValues: { status: 'PENDING_REVIEW', actualSize: processed.actualSize },
      ipAddress: ip,
    });
    await this.notifications.create({
      eventId: `STUDENT_PHOTO_SUBMITTED:${upload.id}`,
      userId,
      notificationType: 'STUDENT_PHOTO_SUBMITTED',
      title: 'عکس کارت سرویس ارسال شد',
      message: 'عکس دانش‌آموز برای بررسی مدیریت ثبت شد.',
      relatedEntityType: 'STUDENT_PHOTO',
      relatedEntityId: upload.id,
    });
    return this.toOwnerView(updated);
  }

  async linkUpload(userId: string, uploadId: string, studentId: string, ip?: string) {
    await this.assertOwnedStudent(userId, studentId);
    const [updated] = await this.db.db
      .update(studentPhotoUploads)
      .set({ studentId, updatedAt: new Date() })
      .where(
        and(
          eq(studentPhotoUploads.id, uploadId),
          eq(studentPhotoUploads.accountUserId, userId),
          isNull(studentPhotoUploads.studentId),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundError('Student photo upload');
    await this.audit.record({
      actorType: 'PARENT',
      actorId: userId,
      action: 'STUDENT_PHOTO_LINKED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: uploadId,
      newValues: { studentId },
      ipAddress: ip,
    });
    return this.toOwnerView(updated);
  }

  async getCurrent(userId: string, studentId?: string) {
    const where = studentId
      ? and(
          eq(studentPhotoUploads.accountUserId, userId),
          eq(studentPhotoUploads.studentId, studentId),
        )
      : eq(studentPhotoUploads.accountUserId, userId);
    const items = await this.db.db
      .select()
      .from(studentPhotoUploads)
      .where(where)
      .orderBy(desc(studentPhotoUploads.createdAt))
      .limit(5);
    return { items: items.map((row) => this.toOwnerView(row)) };
  }

  async getOwnerViewUrl(userId: string, uploadId: string) {
    const [upload] = await this.db.db
      .select()
      .from(studentPhotoUploads)
      .where(eq(studentPhotoUploads.id, uploadId))
      .limit(1);
    if (!upload || upload.accountUserId !== userId) throw new NotFoundError('Student photo upload');
    const key = upload.status === 'APPROVED' ? upload.canonicalKey : upload.rawKey;
    if (!key) throw new NotFoundError('Student photo upload');
    return {
      uploadId: upload.id,
      status: upload.status,
      viewUrl: this.storage.presignGet(key, this.config.studentPhotoViewUrlTtlSeconds),
      expiresInSeconds: this.config.studentPhotoViewUrlTtlSeconds,
    };
  }

  async getManagerApprovedViewUrl(managerId: string, studentId: string, ip?: string) {
    const [upload] = await this.db.db
      .select({
        id: studentPhotoUploads.id,
        canonicalKey: studentPhotoUploads.canonicalKey,
        status: studentPhotoUploads.status,
      })
      .from(studentPhotoUploads)
      .innerJoin(students, eq(students.id, studentPhotoUploads.studentId))
      .innerJoin(
        schoolManagerAssignments,
        and(
          eq(schoolManagerAssignments.schoolId, students.schoolId),
          eq(schoolManagerAssignments.managerUserId, managerId),
          eq(schoolManagerAssignments.status, 'ACTIVE'),
        ),
      )
      .where(
        and(
          eq(students.id, studentId),
          eq(studentPhotoUploads.status, 'APPROVED'),
          isNotNull(studentPhotoUploads.canonicalKey),
        ),
      )
      .orderBy(desc(studentPhotoUploads.approvedAt), desc(studentPhotoUploads.id))
      .limit(1);
    if (!upload?.canonicalKey) throw new NotFoundError('Student photo');
    await this.audit.record({
      actorType: 'SCHOOL_MANAGER',
      actorId: managerId,
      action: 'STUDENT_PHOTO_VIEWED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: upload.id,
      newValues: { studentId, status: upload.status },
      ipAddress: ip,
    });
    return {
      status: 'APPROVED' as const,
      viewUrl: this.storage.presignGet(
        upload.canonicalKey,
        this.config.studentPhotoViewUrlTtlSeconds,
      ),
      expiresInSeconds: this.config.studentPhotoViewUrlTtlSeconds,
    };
  }

  async listForAdmin(query: AdminPhotoListQueryDto) {
    const filters = [sql`true`];
    if (query.status) filters.push(eq(studentPhotoUploads.status, query.status));
    if (query.status === 'PENDING_REVIEW') {
      filters.push(isNotNull(studentPhotoUploads.studentId));
    }
    const where = and(...filters);
    const rows = await this.db.db
      .select({
        upload: studentPhotoUploads,
        student: {
          firstName: students.firstName,
          lastName: students.lastName,
        },
      })
      .from(studentPhotoUploads)
      .leftJoin(students, eq(students.id, studentPhotoUploads.studentId))
      .where(where)
      .orderBy(desc(studentPhotoUploads.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(studentPhotoUploads)
      .where(where);
    return {
      items: rows.map(({ upload, student }) => ({
        ...this.toAdminView(upload),
        student: student ? { firstName: student.firstName, lastName: student.lastName } : null,
      })),
      total: Number(value),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getAdminViewUrl(adminId: string, uploadId: string, ip?: string) {
    const [upload] = await this.db.db
      .select()
      .from(studentPhotoUploads)
      .where(eq(studentPhotoUploads.id, uploadId))
      .limit(1);
    if (!upload) throw new NotFoundError('Student photo upload');
    if (!upload.canonicalKey) throw new NotFoundError('Student photo upload');
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'STUDENT_PHOTO_VIEWED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: uploadId,
      newValues: { status: upload.status },
      ipAddress: ip,
    });
    return {
      uploadId: upload.id,
      status: upload.status,
      viewUrl: this.storage.presignGet(
        upload.canonicalKey,
        this.config.studentPhotoViewUrlTtlSeconds,
      ),
      expiresInSeconds: this.config.studentPhotoViewUrlTtlSeconds,
    };
  }

  async approve(adminId: string, uploadId: string, version: number, ip?: string) {
    const now = new Date();
    const approved = await this.db.db.transaction(async (txn) => {
      const [upload] = await txn
        .select()
        .from(studentPhotoUploads)
        .where(eq(studentPhotoUploads.id, uploadId))
        .limit(1);
      if (!upload) throw new NotFoundError('Student photo upload');
      if (upload.status === 'APPROVED') return upload;
      assertStudentPhotoTransition(upload.status as StudentPhotoStatus, 'APPROVED');
      if (!upload.canonicalKey) throw new ValidationError('The photo has no canonical image.');
      if (!upload.studentId) {
        throw new ConflictError('PHOTO_NOT_LINKED', 'عکس هنوز به دانش‌آموز متصل نشده است.');
      }
      if (upload.studentId) {
        await txn
          .update(studentPhotoUploads)
          .set({ status: 'SUPERSEDED', supersededAt: now, updatedAt: now })
          .where(
            and(
              eq(studentPhotoUploads.studentId, upload.studentId),
              eq(studentPhotoUploads.status, 'APPROVED'),
              ne(studentPhotoUploads.id, upload.id),
            ),
          );
      }
      const [updated] = await txn
        .update(studentPhotoUploads)
        .set({
          status: 'APPROVED',
          version: upload.version + 1,
          reviewerAdminId: adminId,
          reviewedAt: now,
          approvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(studentPhotoUploads.id, upload.id),
            eq(studentPhotoUploads.status, 'PENDING_REVIEW'),
            eq(studentPhotoUploads.version, upload.version),
          ),
        )
        .returning();
      if (!updated) throw new ConflictError('PHOTO_CHANGED', 'عکس هم‌زمان بررسی شده است.');
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `STUDENT_PHOTO_APPROVED:${upload.id}`,
        userId: upload.accountUserId,
        notificationType: 'STUDENT_PHOTO_APPROVED',
        title: 'تایید عکس کارت سرویس',
        message: 'عکس کارت سرویس دانش‌آموز تایید شد.',
        relatedEntityType: 'STUDENT_PHOTO',
        relatedEntityId: upload.id,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'STUDENT_PHOTO_APPROVED',
        entityType: 'STUDENT_PHOTO_UPLOAD',
        entityId: upload.id,
        newValues: { status: 'APPROVED', version: upload.version },
        ipAddress: ip,
      });
      return updated;
    });
    return this.toAdminView(approved);
  }

  async reject(adminId: string, uploadId: string, input: RejectPhotoUploadDto, ip?: string) {
    const now = new Date();
    const rejected = await this.db.db.transaction(async (txn) => {
      const [upload] = await txn
        .select()
        .from(studentPhotoUploads)
        .where(eq(studentPhotoUploads.id, uploadId))
        .limit(1);
      if (!upload) throw new NotFoundError('Student photo upload');
      assertStudentPhotoTransition(upload.status as StudentPhotoStatus, 'REJECTED');
      const [updated] = await txn
        .update(studentPhotoUploads)
        .set({
          status: 'REJECTED',
          version: input.version + 1,
          rejectionCode: input.reason,
          rejectionDetail: input.detail ?? null,
          reviewerAdminId: adminId,
          reviewedAt: now,
          rejectedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(studentPhotoUploads.id, upload.id),
            eq(studentPhotoUploads.status, 'PENDING_REVIEW'),
            eq(studentPhotoUploads.version, input.version),
          ),
        )
        .returning();
      if (!updated) throw new ConflictError('PHOTO_CHANGED', 'عکس هم‌زمان بررسی شده است.');
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `STUDENT_PHOTO_REJECTED:${upload.id}`,
        userId: upload.accountUserId,
        notificationType: 'STUDENT_PHOTO_REJECTED',
        title: 'بررسی مجدد عکس کارت سرویس',
        message: 'عکس کارت سرویس دانش‌آموز نیازمند بارگذاری مجدد است. جزئیات در پنل شما نیست.',
        relatedEntityType: 'STUDENT_PHOTO',
        relatedEntityId: upload.id,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'STUDENT_PHOTO_REJECTED',
        entityType: 'STUDENT_PHOTO_UPLOAD',
        entityId: upload.id,
        newValues: { status: 'REJECTED', rejectionCode: input.reason },
        ipAddress: ip,
      });
      return updated;
    });
    return this.toAdminView(rejected);
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const expirable = await this.db.db
      .select({ id: studentPhotoUploads.id, rawKey: studentPhotoUploads.rawKey })
      .from(studentPhotoUploads)
      .where(
        and(
          eq(studentPhotoUploads.status, 'AUTHORIZED'),
          lt(studentPhotoUploads.uploadAuthorizationExpiry, now),
        ),
      );
    if (expirable.length > 0) {
      await this.db.db
        .update(studentPhotoUploads)
        .set({ status: 'EXPIRED', updatedAt: now })
        .where(
          inArray(
            studentPhotoUploads.id,
            expirable.map((row) => row.id),
          ),
        );
      await Promise.all(
        expirable.map((row) => this.storage.deleteObject(row.rawKey).catch(() => undefined)),
      );
    }

    const stalled = await this.db.db
      .select({ id: studentPhotoUploads.id, rawKey: studentPhotoUploads.rawKey })
      .from(studentPhotoUploads)
      .where(
        and(
          eq(studentPhotoUploads.status, 'UPLOADED'),
          lt(studentPhotoUploads.updatedAt, new Date(now.getTime() - UPLOADED_STALL_MS)),
        ),
      );
    if (stalled.length > 0) {
      await this.db.db
        .update(studentPhotoUploads)
        .set({ status: 'FAILED', failedAt: now, updatedAt: now })
        .where(
          inArray(
            studentPhotoUploads.id,
            stalled.map((row) => row.id),
          ),
        );
      await Promise.all(
        stalled.map((row) => this.storage.deleteObject(row.rawKey).catch(() => undefined)),
      );
    }

    const removable = await this.db.db
      .select({ id: studentPhotoUploads.id, rawKey: studentPhotoUploads.rawKey })
      .from(studentPhotoUploads)
      .where(
        and(
          inArray(studentPhotoUploads.status, ['REJECTED', 'FAILED', 'EXPIRED', 'SUPERSEDED']),
          lt(studentPhotoUploads.updatedAt, new Date(now.getTime() - RAW_RETENTION_MS)),
        ),
      );
    if (removable.length > 0) {
      await Promise.all(
        removable.map((row) => this.storage.deleteObject(row.rawKey).catch(() => undefined)),
      );
    }

    const canonicalRemovable = await this.db.db
      .select({ id: studentPhotoUploads.id, canonicalKey: studentPhotoUploads.canonicalKey })
      .from(studentPhotoUploads)
      .where(
        and(
          inArray(studentPhotoUploads.status, ['REJECTED', 'SUPERSEDED']),
          lt(studentPhotoUploads.updatedAt, new Date(now.getTime() - CANONICAL_RETENTION_MS)),
        ),
      );
    if (canonicalRemovable.length > 0) {
      await Promise.all(
        canonicalRemovable
          .filter((row) => row.canonicalKey)
          .map((row) =>
            this.storage.deleteObject(row.canonicalKey as string).catch(() => undefined),
          ),
      );
    }
    return expirable.length + stalled.length;
  }

  private async assertOwnedStudent(userId: string, studentId: string) {
    const [owned] = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.userId, userId)))
      .limit(1);
    if (!owned) throw new NotFoundError('Student');
  }

  private async markFailed(uploadId: string, rejectionCode: string, ip?: string) {
    await this.db.db
      .update(studentPhotoUploads)
      .set({
        status: 'FAILED',
        rejectionCode,
        failedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentPhotoUploads.id, uploadId));
    await this.audit.record({
      actorType: 'SYSTEM',
      actorId: 'system',
      action: 'STUDENT_PHOTO_FAILED',
      entityType: 'STUDENT_PHOTO_UPLOAD',
      entityId: uploadId,
      newValues: { status: 'FAILED', rejectionCode },
      ipAddress: ip,
    });
  }

  private toOwnerView(row: typeof studentPhotoUploads.$inferSelect) {
    return {
      uploadId: row.id,
      studentId: row.studentId,
      status: row.status as StudentPhotoStatus,
      rejectionCode: row.rejectionCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toAdminView(row: typeof studentPhotoUploads.$inferSelect) {
    return {
      uploadId: row.id,
      studentId: row.studentId,
      status: row.status as StudentPhotoStatus,
      version: row.version,
      declaredMime: row.declaredMime,
      declaredSize: row.declaredSize,
      actualSize: row.actualSize,
      width: row.width,
      height: row.height,
      rejectionCode: row.rejectionCode,
      rejectionDetail: row.rejectionDetail,
      reviewerAdminId: row.reviewerAdminId,
      hasCanonical: Boolean(row.canonicalKey),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
