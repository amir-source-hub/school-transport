import { describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuditPort } from '../../common/audit.port';
import { ReportsController } from './reports.controller';
import type { ReportsService } from './reports.service';

describe('ReportsController', () => {
  it('audits with a nullable report entity id and sends the generated workbook', async () => {
    const report = Buffer.from('xlsx-content');
    const reportsService = {
      createComprehensiveWorkbook: vi.fn().mockResolvedValue(report),
    } as unknown as ReportsService;
    const auditService = { record: vi.fn().mockResolvedValue(undefined) } as unknown as AuditPort;
    const headers = new Map<string, string>();
    const reply = {
      header: vi.fn((name: string, value: string) => {
        headers.set(name, value);
        return reply;
      }),
      send: vi.fn(),
    } as unknown as FastifyReply;
    const request = {
      id: 'request-1',
      ip: '127.0.0.1',
      user: { id: '00000000-0000-4000-8000-000000000001' },
    } as unknown as FastifyRequest & { user: { id: string } };

    await new ReportsController(reportsService, auditService).downloadComprehensiveReport(
      reply,
      request,
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REPORT_EXPORTED', entityType: 'REPORT' }),
    );
    expect(auditService.record).not.toHaveBeenCalledWith(
      expect.objectContaining({ entityId: expect.anything() }),
    );
    expect(headers.get('Content-Type')).toContain('spreadsheetml.sheet');
    expect(reply.send).toHaveBeenCalledWith(report);
  });
});
