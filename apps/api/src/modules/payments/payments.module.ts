import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  OnboardingPaymentsController,
  PaymentsController,
  AdminPaymentsController,
} from './payments.controller';
import { MockPaymentGateway, PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';
import { ConfigService } from '../../config/config.service';
import { OnboardingGuard } from '../access-control/onboarding.guard';

@Module({
  controllers: [PaymentsController, AdminPaymentsController, OnboardingPaymentsController],
  providers: [
    PaymentsService,
    OnboardingGuard,
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
