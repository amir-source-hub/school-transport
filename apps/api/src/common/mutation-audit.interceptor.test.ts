import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { MutationAuditInterceptor } from './mutation-audit.interceptor';

function context(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe('MutationAuditInterceptor', () => {
  it('records authenticated mutations without request bodies or response values', async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const interceptor = new MutationAuditInterceptor(audit as never);
    const request = {
      method: 'PATCH',
      url: '/api/v1/admin/students/00000000-0000-4000-8000-000000000001',
      routeOptions: { url: '/api/v1/admin/students/:id' },
      params: { id: '00000000-0000-4000-8000-000000000001' },
      body: { nationalId: '0012345678', receipt: 'secret' },
      user: { id: '00000000-0000-4000-8000-000000000002', role: 'ADMIN' },
      ip: '127.0.0.1',
    };
    await new Promise<void>((resolve, reject) =>
      interceptor
        .intercept(context(request), { handle: () => of({ secret: true }) } as never)
        .subscribe({
          complete: resolve,
          error: reject,
        }),
    );
    expect(audit.record).toHaveBeenCalledWith({
      actorType: 'ADMIN',
      actorId: '00000000-0000-4000-8000-000000000002',
      action: 'HTTP_PATCH_COMPLETED',
      entityType: 'STUDENTS',
      entityId: '00000000-0000-4000-8000-000000000001',
      ipAddress: '127.0.0.1',
    });
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('0012345678');
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('secret');
  });

  it('does not audit reads or failed mutations and never changes a successful response on audit failure', async () => {
    const audit = { record: vi.fn(async () => Promise.reject(new Error('audit unavailable'))) };
    const interceptor = new MutationAuditInterceptor(audit as never);
    const base = {
      url: '/api/v1/students',
      routeOptions: { url: '/api/v1/students' },
      user: { id: '00000000-0000-4000-8000-000000000002', role: 'PARENT' },
      ip: '127.0.0.1',
    };
    const read = await new Promise((resolve, reject) =>
      interceptor
        .intercept(context({ ...base, method: 'GET' }), { handle: () => of('read') } as never)
        .subscribe({ next: resolve, error: reject }),
    );
    expect(read).toBe('read');
    expect(audit.record).not.toHaveBeenCalled();
    const write = await new Promise((resolve, reject) =>
      interceptor
        .intercept(context({ ...base, method: 'POST' }), { handle: () => of('created') } as never)
        .subscribe({ next: resolve, error: reject }),
    );
    expect(write).toBe('created');
  });
});
