import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { AuthService } from './application/auth.service';
import { AdminIdentityController, AuthController } from './presentation/auth.controller';
import { TrustedOriginGuard } from '../access-control/trusted-origin.guard';
import {
  ConsoleOtpDelivery,
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
  controllers: [AuthController, AdminIdentityController],
  providers: [
    AuthService,
    TrustedOriginGuard,
    ConsoleOtpDelivery,
    UnconfiguredOtpDelivery,
    {
      provide: OTP_DELIVERY,
      inject: [ConfigService, ConsoleOtpDelivery, UnconfiguredOtpDelivery],
      useFactory: (
        config: ConfigService,
        consoleDelivery: ConsoleOtpDelivery,
        unavailableDelivery: UnconfiguredOtpDelivery,
      ) =>
        config.nodeEnv !== 'production' && config.otpProvider === 'console'
          ? consoleDelivery
          : unavailableDelivery,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class IdentityModule {}
