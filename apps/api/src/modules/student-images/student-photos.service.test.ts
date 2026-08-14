import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors';
import type { AuditPort } from '../../common/audit.port';
import type { ConfigService } from '../../config/config.service';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import type { S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { StudentPhotosService } from './student-photos.service';

function config(overrides: Partial<Record<keyof ConfigService, unknown>> = {}): ConfigService {
  return {
    studentPhotoUploadUrlTtlSeconds: 300,
    studentPhotoViewUrlTtlSeconds: 300,
    studentPhotoMaxBytes: 5 * 1024 * 1024,
    studentPhotoMaxPixels: 12_500_000,
    studentPhotoMaxAxis: 8000,
    studentPhotoOutputWidth: 600,
    studentPhotoOutputHeight: 800,
    studentPhotoJpegQuality: 85,
    studentPhotoMaxActiveUploads: 3,
    ...overrides,
  } as unknown as ConfigService;
}

function selectLimit(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.innerJoin = vi.fn(() => chain);
  chain.leftJoin = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.offset = vi.fn(() => chain);
  chain.limit = vi.fn(async () => rows);
  return chain;
}

function selectWhere(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(async () => rows);
  return chain;
}

function updateSimple(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(async () => []);
  chain.returning = vi.fn(async () => []);
  return chain;
}

function updateReturning(rows: unknown[]): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain.set = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.returning = vi.fn(async () => rows);
  return chain;
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'upload-1',
    accountUserId: 'user-1',
    studentId: 'student-1',
    rawKey: 'student-photos/raw/raw-1.jpg',
    canonicalKey: null,
    declaredMime: 'image/jpeg',
    declaredSize: 100_000,
    actualMime: null,
    actualSize: null,
    width: null,
    height: null,
    checksum: null,
    status: 'UPLOADED',
    rejectionCode: null,
    rejectionDetail: null,
    reviewerAdminId: null,
    uploadAuthorizationExpiry: new Date(Date.now() + 60_000),
    version: 1,
    createdAt: new Date(Date.now() - 1000),
    updatedAt: new Date(Date.now() - 1000),
    pendingReviewAt: null,
    reviewedAt: null,
    approvedAt: null,
    rejectedAt: null,
    supersededAt: null,
    failedAt: null,
    validatingAt: null,
    uploadedAt: null,
    ...overrides,
  };
}

function storage(overrides: Partial<Record<keyof S3Storage, unknown>> = {}): S3Storage {
  return {
    presignPut: vi.fn(() => 'https://s3.example/presigned-put'),
    presignGet: vi.fn(() => 'https://s3.example/presigned-get'),
    headObject: vi.fn(async () => ({ size: 100_000, etag: '"etag"' })),
    getObject: vi.fn(),
    putObject: vi.fn(async () => undefined),
    deleteObject: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as S3Storage;
}

function notifications() {
  return {
    create: vi.fn(async () => undefined),
    enqueueInTransaction: vi.fn(async () => undefined),
  } as unknown as InAppNotificationService;
}

function audit() {
  return {
    record: vi.fn(async () => undefined),
    recordInTransaction: vi.fn(async () => undefined),
  } as unknown as AuditPort;
}

describe('StudentPhotosService authorizeUpload', () => {
  it('throws ConflictError when the active-upload cap is reached', async () => {
    const db = {
      db: {
        update: vi.fn(() => updateReturning([])),
        select: vi.fn(() => selectWhere([{ count: '3' }])),
        insert: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(
      service.authorizeUpload('user-1', { declaredMime: 'image/jpeg', declaredSize: 100_000 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(service).toBeInstanceOf(StudentPhotosService);
  });

  it('rejects a declared size above the byte cap', async () => {
    const db = {
      db: {
        update: vi.fn(() => updateReturning([])),
        select: vi.fn(() => selectWhere([{ count: '0' }])),
        insert: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(
      service.authorizeUpload('user-1', {
        declaredMime: 'image/png',
        declaredSize: 5 * 1024 * 1024 + 1,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('returns a presigned PUT URL and stores an AUTHORIZED row', async () => {
    const saved = baseRow({ id: 'upload-9', status: 'AUTHORIZED' });
    const db = {
      db: {
        update: vi.fn(() => updateReturning([])),
        select: vi.fn(() => selectWhere([{ count: '0' }])),
        insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => [saved]) })) })),
      },
    } as unknown as DatabaseService;
    const store = storage();
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    const result = await service.authorizeUpload('user-1', {
      declaredMime: 'image/jpeg',
      declaredSize: 5 * 1024 * 1024,
    });
    expect(result.uploadId).toBe('upload-9');
    expect(result.uploadUrl).toBe('https://s3.example/presigned-put');
    expect(result.maxBytes).toBe(config().studentPhotoMaxBytes);
    expect(store.presignPut).toHaveBeenCalledWith(
      expect.stringMatching(/^student-photos\/raw\//),
      'image/jpeg',
      300,
    );
  });

  it('checks student ownership when a studentId is provided', async () => {
    const db = {
      db: {
        select: vi
          .fn()
          .mockReturnValueOnce(selectLimit([]))
          .mockReturnValueOnce(selectWhere([{ count: '0' }])),
        insert: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(
      service.authorizeUpload('user-1', {
        studentId: 'foreign-student',
        declaredMime: 'image/jpeg',
        declaredSize: 100_000,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('StudentPhotosService completeUpload', () => {
  it('rejects an upload whose authorization has expired', async () => {
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow({ status: 'EXPIRED' })])),
        update: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toMatchObject({
      code: 'PHOTO_UPLOAD_EXPIRED',
    });
  });

  it('fails the upload when the object never reached storage', async () => {
    const store = storage({
      headObject: vi.fn(async () => {
        throw new Error('Not Found');
      }),
    });
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow()])),
        update: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toMatchObject({
      code: 'PHOTO_UPLOAD_MISSING',
    });
  });

  it('rejects an unowned upload', async () => {
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow({ accountUserId: 'someone-else' })])),
        update: vi.fn(),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rejects declared-versus-stored size mismatch before downloading or decoding', async () => {
    const store = storage({
      headObject: vi.fn(async () => ({ size: 99, etag: 'etag' })),
      getObject: vi.fn(),
    });
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow({ declaredSize: 100 })])),
        update: vi.fn(() => updateSimple()),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(store.getObject).not.toHaveBeenCalled();
    expect(store.deleteObject).toHaveBeenCalledWith('student-photos/raw/raw-1.jpg');
  });

  it('rejects storage read truncation before image decoding', async () => {
    const store = storage({
      headObject: vi.fn(async () => ({ size: 100, etag: 'etag' })),
      getObject: vi.fn(async () => Buffer.alloc(99)),
    });
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow({ declaredSize: 100 })])),
        update: vi.fn(() => updateSimple()),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(store.deleteObject).toHaveBeenCalledWith('student-photos/raw/raw-1.jpg');
  });

  it('processes a valid image into PENDING_REVIEW', async () => {
    const png = await sharp({
      create: { width: 1200, height: 1600, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    const store = storage({
      headObject: vi.fn(async () => ({ size: png.length, etag: 'etag' })),
      getObject: vi.fn(async () => png),
    });
    const updated = baseRow({
      status: 'PENDING_REVIEW',
      canonicalKey: 'student-photos/canonical/canon-1.jpg',
      actualMime: 'image/jpeg',
      width: 600,
      height: 800,
    });
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow({ declaredSize: png.length })])),
        update: vi
          .fn()
          .mockReturnValueOnce(updateSimple())
          .mockReturnValueOnce(updateReturning([updated])),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    const result = await service.completeUpload('user-1', 'upload-1');
    expect(result.status).toBe('PENDING_REVIEW');
    expect(store.putObject).toHaveBeenCalledWith(
      expect.stringMatching(/^student-photos\/canonical\//),
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(store.deleteObject).toHaveBeenCalledWith('student-photos/raw/raw-1.jpg');
  });

  it('returns the authoritative state and preserves raw data when a retry loses the optimistic claim', async () => {
    const png = await sharp({
      create: { width: 1200, height: 1600, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    const store = storage({
      headObject: vi.fn(async () => ({ size: png.length, etag: 'etag' })),
      getObject: vi.fn(async () => png),
    });
    const db = {
      db: {
        select: vi
          .fn()
          .mockReturnValueOnce(selectLimit([baseRow({ declaredSize: png.length })]))
          .mockReturnValueOnce(selectLimit([baseRow({ status: 'VALIDATING' })])),
        update: vi
          .fn()
          .mockReturnValueOnce(updateSimple())
          .mockReturnValueOnce(updateReturning([]))
          .mockReturnValueOnce(updateSimple()),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).resolves.toMatchObject({
      status: 'VALIDATING',
    });
    expect(store.deleteObject).not.toHaveBeenCalledWith('student-photos/raw/raw-1.jpg');
    expect(store.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/^student-photos\/canonical\/.+\.jpg$/),
    );
  });

  it('makes a completion retry idempotent while the original request is validating', async () => {
    const validating = baseRow({ status: 'VALIDATING' });
    const db = {
      db: { select: vi.fn(() => selectLimit([validating])), update: vi.fn() },
    } as unknown as DatabaseService;
    const store = storage();
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).resolves.toMatchObject({
      status: 'VALIDATING',
    });
    expect(store.headObject).not.toHaveBeenCalled();
  });

  it('marks a corrupt image as FAILED and removes the raw object', async () => {
    const store = storage({
      getObject: vi.fn(async () => Buffer.from('definitely not an image')),
    });
    const db = {
      db: {
        select: vi.fn(() => selectLimit([baseRow()])),
        update: vi.fn(() => updateSimple()),
      },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.completeUpload('user-1', 'upload-1')).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(store.deleteObject).toHaveBeenCalledWith('student-photos/raw/raw-1.jpg');
  });
});

describe('StudentPhotosService approve', () => {
  it('approves a pending photo, supersedes the previous approval, and notifies the owner', async () => {
    const pending = baseRow({
      status: 'PENDING_REVIEW',
      canonicalKey: 'student-photos/canonical/canon-1.jpg',
      pendingReviewAt: new Date(),
    });
    const approved = { ...pending, status: 'APPROVED' };
    const txn = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectLimit([pending]))
        .mockReturnValueOnce(selectLimit([])),
      update: vi
        .fn()
        .mockReturnValueOnce(updateSimple())
        .mockReturnValueOnce(updateReturning([approved])),
    };
    const db = {
      db: {
        transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)),
      },
    } as unknown as DatabaseService;
    const notice = notifications();
    const auditLog = audit();
    const service = new StudentPhotosService(db, config(), notice, storage(), auditLog);

    const result = await service.approve('admin-1', 'upload-1', 1);
    expect(result.status).toBe('APPROVED');
    expect(notice.enqueueInTransaction).toHaveBeenCalledWith(
      txn,
      expect.objectContaining({ notificationType: 'STUDENT_PHOTO_APPROVED', userId: 'user-1' }),
    );
    expect(auditLog.recordInTransaction).toHaveBeenCalled();
  });

  it('raises ConflictError when the row was already reviewed', async () => {
    const pending = baseRow({ status: 'PENDING_REVIEW', canonicalKey: 'canonical/c.jpg' });
    const txn = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectLimit([pending]))
        .mockReturnValueOnce(selectLimit([])),
      update: vi.fn(() => updateReturning([])),
    };
    const db = {
      db: { transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)) },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(service.approve('admin-1', 'upload-1', 1)).rejects.toMatchObject({
      code: 'PHOTO_CHANGED',
    });
  });

  it('approves the exact pending photo selected by the admin', async () => {
    const pending = baseRow({ status: 'PENDING_REVIEW', canonicalKey: 'canonical/old.jpg' });
    const approved = { ...pending, status: 'APPROVED' };
    const txn = {
      select: vi.fn(() => selectLimit([pending])),
      update: vi
        .fn()
        .mockReturnValueOnce(updateSimple())
        .mockReturnValueOnce(updateReturning([approved])),
    };
    const db = {
      db: { transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)) },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(service.approve('admin-1', 'upload-1', 1)).resolves.toMatchObject({
      status: 'APPROVED',
    });
  });

  it('rejects approving a photo that is not pending review', async () => {
    const txn = {
      select: vi.fn(() => selectLimit([baseRow({ status: 'REJECTED' })])),
      update: vi.fn(),
    };
    const db = {
      db: { transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)) },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(service.approve('admin-1', 'upload-1', 1)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('StudentPhotosService reject', () => {
  it('rejects a pending photo with a reason and notifies the owner', async () => {
    const pending = baseRow({ status: 'PENDING_REVIEW', canonicalKey: 'canonical/c.jpg' });
    const rejected = { ...pending, status: 'REJECTED' };
    const txn = {
      select: vi.fn(() => selectLimit([pending])),
      update: vi.fn(() => updateReturning([rejected])),
    };
    const db = {
      db: { transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)) },
    } as unknown as DatabaseService;
    const notice = notifications();
    const auditLog = audit();
    const service = new StudentPhotosService(db, config(), notice, storage(), auditLog);

    const result = await service.reject('admin-1', 'upload-1', { reason: 'BLURRED', version: 1 });
    expect(result.status).toBe('REJECTED');
    expect(notice.enqueueInTransaction).toHaveBeenCalledWith(
      txn,
      expect.objectContaining({ notificationType: 'STUDENT_PHOTO_REJECTED' }),
    );
    expect(auditLog.recordInTransaction).toHaveBeenCalled();
  });

  it('raises ConflictError when the row was already reviewed', async () => {
    const txn = {
      select: vi.fn(() => selectLimit([baseRow({ status: 'PENDING_REVIEW' })])),
      update: vi.fn(() => updateReturning([])),
    };
    const db = {
      db: { transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(txn)) },
    } as unknown as DatabaseService;
    const service = new StudentPhotosService(db, config(), notifications(), storage(), audit());

    await expect(
      service.reject('admin-1', 'upload-1', { reason: 'BLURRED', version: 1 }),
    ).rejects.toMatchObject({
      code: 'PHOTO_CHANGED',
    });
  });
});

describe('StudentPhotosService cleanupExpired', () => {
  it('expires stale authorizations and fails stalled uploads', async () => {
    const expirable = baseRow({ id: 'exp-1', status: 'AUTHORIZED' });
    const stalled = baseRow({ id: 'stall-1', status: 'UPLOADED' });
    const stalledValidation = baseRow({ id: 'validation-stall-1', status: 'VALIDATING' });
    const removable = baseRow({ id: 'old-1', status: 'REJECTED' });
    const canonicalRemovable = baseRow({
      id: 'old-c-1',
      status: 'SUPERSEDED',
      canonicalKey: 'canonical/x.jpg',
    });
    const db = {
      db: {
        select: vi
          .fn()
          .mockReturnValueOnce(selectWhere([expirable]))
          .mockReturnValueOnce(selectWhere([stalled]))
          .mockReturnValueOnce(selectWhere([stalledValidation]))
          .mockReturnValueOnce(selectWhere([removable]))
          .mockReturnValueOnce(selectWhere([canonicalRemovable])),
        update: vi.fn(() => updateSimple()),
      },
    } as unknown as DatabaseService;
    const store = storage();
    const service = new StudentPhotosService(db, config(), notifications(), store, audit());

    await expect(service.cleanupExpired()).resolves.toBe(3);
    expect(store.deleteObject).toHaveBeenCalledWith(expirable.rawKey);
    expect(store.deleteObject).toHaveBeenCalledWith(stalledValidation.rawKey);
    expect(store.deleteObject).toHaveBeenCalledWith('canonical/x.jpg');
  });
});
