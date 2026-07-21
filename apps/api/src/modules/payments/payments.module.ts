import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController } from './payments.controller';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    UnconfiguredPaymentGateway,
    { provide: PAYMENT_GATEWAY, useExisting: UnconfiguredPaymentGateway },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
