import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AUDIT_PORT } from '../../common/audit.port';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, { provide: AUDIT_PORT, useExisting: AuditService }],
  exports: [AUDIT_PORT],
})
export class AuditModule {}
