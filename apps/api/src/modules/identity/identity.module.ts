import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '../../config/config.service';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { TrustedOriginGuard } from '../access-control/trusted-origin.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtAccessTokenTtl },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TrustedOriginGuard],
  exports: [AuthService, JwtModule],
})
export class IdentityModule {}
