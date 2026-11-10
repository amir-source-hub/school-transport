import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';

describe('driver document archive', () => {
  it('groups driver and vehicle documents under the owning driver', async () => {
    const rows = [
      { id: 'doc-1', documentType: 'DRIVER_PHOTO', pageNumber: 1, objectKey: 'driver/photo', mimeType: 'image/jpeg', driverId: 'driver-1', firstName: 'علی', lastName: 'احمدی' },
      { id: 'doc-2', documentType: 'VEHICLE_CARD', pageNumber: 2, objectKey: 'vehicle/card', mimeType: 'application/pdf', driverId: 'driver-1', firstName: 'علی', lastName: 'احمدی' },
    ];
    const query = { leftJoin: () => query, innerJoin: async () => rows };
    const getObject = vi.fn(async (key: string) => Buffer.from(key));
    const service = new PaymentsService({ db: { select: () => ({ from: () => query }) } } as never, {} as never, {} as never, undefined, undefined, { getObject } as never);
    const archive = await service.exportStudentImages('driver-documents');
    const chunks: Buffer[] = [];
    for await (const chunk of archive) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString('utf8');
    expect(body).toContain('علی احمدی-driver-1/DRIVER_PHOTO-page-1-doc-1.jpg');
    expect(body).toContain('علی احمدی-driver-1/VEHICLE_CARD-page-2-doc-2.pdf');
    expect(getObject).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['photos', { studentId: 'student-1', firstName: 'علی', lastName: 'احمدی', uploadId: 'photo-1', rawKey: 'student/photo', canonicalKey: null, actualMime: 'image/jpeg' }, 'علی احمدی-student-1/student-photo-photo-1.jpg'],
    ['receipts', { studentId: 'student-1', firstName: 'علی', lastName: 'احمدی', submissionId: 'receipt-1', key: 'receipt/image', mime: 'image/png' }, 'علی احمدی-student-1/payment-receipt-receipt-1.png'],
  ] as const)('streams %s into student folders', async (kind, row, filename) => {
    const query = { innerJoin: () => query, where: async () => [row], then: (resolve: (value: typeof row[]) => unknown) => Promise.resolve([row]).then(resolve) };
    const getObject = vi.fn(async (key: string) => Buffer.from(key));
    const service = new PaymentsService({ db: { select: () => ({ from: () => query }) } } as never, {} as never, {} as never, undefined, undefined, { getObject } as never);
    const archive = await service.exportStudentImages(kind);
    const chunks: Buffer[] = [];
    for await (const chunk of archive) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).toString('utf8')).toContain(filename);
    expect(getObject).toHaveBeenCalledOnce();
  });
});
