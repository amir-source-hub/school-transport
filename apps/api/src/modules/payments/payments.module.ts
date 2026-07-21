import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController } from './payments.controller';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
