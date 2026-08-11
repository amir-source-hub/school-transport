import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../../common/http-request';
import { AdminContractsController } from './contracts.controller';
import type { ContractsService } from './contracts.service';

describe('admin contract acceptance', () => {
  it('records admin identity and the exact reviewed contract proof', async () => {
    const accept = vi.fn(async () => ({ id: 'contract-1', contractStatus: 'ACCEPTED' }));
    const controller = new AdminContractsController({ accept } as unknown as ContractsService);
    const request = {
      user: { id: 'admin-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    } as unknown as AuthenticatedRequest;

    await controller.acceptOnBehalf(request, 'contract-1', {
      templateHash: 'hash-1',
      reviewedPages: [1, 2, 3],
      reason: 'بررسی حضوری',
      source: 'admin_console',
    });

    expect(accept).toHaveBeenCalledWith(
      'contract-1',
      'admin-1',
      expect.objectContaining({
        adminId: 'admin-1',
        templateHash: 'hash-1',
        reviewedPages: [1, 2, 3],
        signerReason: 'بررسی حضوری',
        signerSource: 'admin_console',
      }),
    );
  });
});
