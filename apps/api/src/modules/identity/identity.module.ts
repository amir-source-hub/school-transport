import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { AuthService } from './application/auth.service';
import { OnboardingService } from './application/onboarding.service';
import {
  AdminIdentityController,
  AuthController,
  ManagerSettingsController,
} from './presentation/auth.controller';
import { TrustedOriginGuard } from '../access-control/trusted-origin.guard';
import { OnboardingGuard } from '../access-control/onboarding.guard';
import {
  ConsoleOtpDelivery,
  KavenegarOtpDelivery,
  UnconfiguredOtpDelivery,
} from './infrastructure/otp-delivery';
import { OTP_DELIVERY } from './application/otp-delivery.port';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtAccessTokenTtl },
      }),
    }),
  ],
  controllers: [AuthController, AdminIdentityController, ManagerSettingsController],
  providers: [
    AuthService,
    OnboardingService,
    TrustedOriginGuard,
    OnboardingGuard,
    ConsoleOtpDelivery,
    KavenegarOtpDelivery,
    UnconfiguredOtpDelivery,
    {
      provide: OTP_DELIVERY,
      inject: [ConfigService, ConsoleOtpDelivery, KavenegarOtpDelivery, UnconfiguredOtpDelivery],
      useFactory: (
        config: ConfigService,
        consoleDelivery: ConsoleOtpDelivery,
        kavenegarDelivery: KavenegarOtpDelivery,
        unavailableDelivery: UnconfiguredOtpDelivery,
      ) => {
        if (config.otpProvider === 'kavenegar') return kavenegarDelivery;
        if (config.nodeEnv !== 'production' && config.otpProvider === 'console')
          return consoleDelivery;
        return unavailableDelivery;
      },
    },
  ],
  exports: [AuthService, JwtModule],
})
export class IdentityModule {}
