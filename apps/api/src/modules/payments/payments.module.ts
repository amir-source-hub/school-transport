import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController, AdminPaymentsController } from './payments.controller';
import { MockPaymentGateway, PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';
import { ConfigService } from '../../config/config.service';

@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    PaymentsService,
    UnconfiguredPaymentGateway,
    MockPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ConfigService, MockPaymentGateway, UnconfiguredPaymentGateway],
      useFactory: (
        config: ConfigService,
        mockGateway: MockPaymentGateway,
        unavailableGateway: UnconfiguredPaymentGateway,
      ) =>
        config.nodeEnv !== 'production' && config.paymentGatewayProvider === 'mock'
          ? mockGateway
          : unavailableGateway,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
