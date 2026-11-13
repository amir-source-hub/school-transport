import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  OnboardingPaymentsController,
  PaymentsController,
  AdminPaymentsController,
  GatewayReturnController,
  PublicPaymentSettingsController,
} from './payments.controller';
import { PAYMENT_GATEWAY, UnconfiguredPaymentGateway, ZibalPaymentGateway } from './payment-gateway';
import { ConfigService } from '../../config/config.service';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import { S3Module } from '../../infrastructure/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [PaymentsController, AdminPaymentsController, OnboardingPaymentsController, GatewayReturnController, PublicPaymentSettingsController],
  providers: [
    PaymentsService,
    OnboardingGuard,
    UnconfiguredPaymentGateway,
    ZibalPaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      inject: [UnconfiguredPaymentGateway, ZibalPaymentGateway, ConfigService],
      useFactory: (unavailableGateway: UnconfiguredPaymentGateway, zibal: ZibalPaymentGateway, config: ConfigService) =>
        config.onlinePaymentEnabled && config.paymentGatewayProvider === 'zibal' ? zibal : unavailableGateway,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
