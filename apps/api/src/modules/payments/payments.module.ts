import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  OnboardingPaymentsController,
  PaymentsController,
  AdminPaymentsController,
} from './payments.controller';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway } from './payment-gateway';
import { OnboardingGuard } from '../access-control/onboarding.guard';

@Module({
  controllers: [PaymentsController, AdminPaymentsController, OnboardingPaymentsController],
  providers: [
    PaymentsService,
    OnboardingGuard,
    UnconfiguredPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [UnconfiguredPaymentGateway],
      useFactory: (unavailableGateway: UnconfiguredPaymentGateway) => unavailableGateway,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
