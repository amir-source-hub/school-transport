import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { AdminDriversController } from './driver-enrollment.controller';

describe('admin driver archive and permanent deletion routes', () => {
  it('keeps archive, restore, and permanent removal as distinct admin actions', async () => {
    const deactivateAdminDriver = vi.fn(async () => ({ deactivated: true }));
    const restoreAdminDriver = vi.fn(async () => ({ status: 'ACTIVE' }));
    const permanentlyDeleteAdminDriver = vi.fn(async () => ({ deleted: true }));
    const controller = new AdminDriversController({ deactivateAdminDriver, restoreAdminDriver, permanentlyDeleteAdminDriver } as never);
    const request = { user: { id: 'admin-1' }, ip: '127.0.0.1' } as never;

    await controller.removeDriver(request, 'driver-1');
    await controller.restoreDriver(request, 'driver-1');
    await controller.permanentlyDeleteDriver(request, 'driver-1');

    expect(deactivateAdminDriver).toHaveBeenCalledWith('driver-1', 'admin-1', '127.0.0.1');
    expect(restoreAdminDriver).toHaveBeenCalledWith('driver-1', 'admin-1', '127.0.0.1');
    expect(permanentlyDeleteAdminDriver).toHaveBeenCalledWith('driver-1', 'admin-1', '127.0.0.1');
  });
});
