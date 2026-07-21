import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../application/auth.service';
import { Public } from '../../../common/decorators';
import { AuthGuard } from '../../access-control/auth.guard';
import { successResponse } from '../../../common/response';
import { ConfigService } from '../../../config/config.service';
import { ValidationError } from '../../../common/errors';
import { TrustedOriginGuard } from '../../access-control/trusted-origin.guard';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
class SendOtpDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;
}
class VerifyOtpDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
class ForgotPasswordDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;
}
class ResetPasswordDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.registerParent(dto.username, dto.password);
    return successResponse(result);
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: FastifyRequest,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.loginParent(dto.username, dto.password, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceName: req.headers['user-agent']?.slice(0, 255),
    });
    this.setRefreshCookie(reply, result.refreshToken);
    return successResponse({
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Req() req: FastifyRequest,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.loginAdmin(dto.username, dto.password, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceName: req.headers['user-agent']?.slice(0, 255),
    });
    this.setRefreshCookie(reply, result.refreshToken, true);
    return successResponse({
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new ValidationError('A refresh token is required.');
    }
    const tokens = await this.authService.refreshTokens(refreshToken, 'PARENT');
    this.setRefreshCookie(reply, tokens.refreshToken);
    return successResponse({ accessToken: tokens.accessToken });
  }

  @UseGuards(AuthGuard, TrustedOriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) reply: FastifyReply) {
    const userId = req.user?.id;
    if (userId && req.user?.sessionId) {
      await this.authService.logout(userId, req.user.sessionId);
    }
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
    return successResponse({ loggedOut: true });
  }

  @Public()
  @Post('send-phone-verification')
  @HttpCode(HttpStatus.OK)
  async sendPhoneVerification(@Body() dto: SendOtpDto) {
    const result = await this.authService.sendOtp(dto.phoneNumber, 'PRIMARY_PHONE_VERIFICATION');
    return successResponse(result);
  }

  @Public()
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(
      dto.phoneNumber,
      'PRIMARY_PHONE_VERIFICATION',
      dto.code,
    );
    return successResponse(result);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.phoneNumber);
    return successResponse(result);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.phoneNumber, dto.code, dto.newPassword);
    return successResponse({ passwordReset: true });
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(
      req.user.id,
      req.user.role,
      dto.oldPassword,
      dto.newPassword,
    );
    return successResponse({ passwordChanged: true });
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return successResponse({ user: req.user });
  }

  private setRefreshCookie(reply: FastifyReply, token: string, isAdmin = false) {
    const maxAge = isAdmin ? this.config.adminJwtRefreshTokenTtl : this.config.jwtRefreshTokenTtl;
    reply.setCookie('refresh_token', token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge,
    });
  }
}
