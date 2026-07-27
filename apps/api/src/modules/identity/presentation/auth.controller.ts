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
  Param,
  Patch,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import type { CookieSerializeOptions } from '@fastify/cookie';
import { AuthService } from '../application/auth.service';
import { Public } from '../../../common/decorators';
import { AuthGuard } from '../../access-control/auth.guard';
import { successResponse } from '../../../common/response';
import { ConfigService } from '../../../config/config.service';
import { ValidationError } from '../../../common/errors';
import { TrustedOriginGuard } from '../../access-control/trusted-origin.guard';
import { RolesGuard } from '../../access-control/roles.guard';
import { Roles } from '../../../common/decorators';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

class CreateAdminDto {
  @IsString()
  @Length(3, 100)
  username!: string;

  @IsString()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  lastName!: string;

  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @Length(3, 100)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @Matches(/^09\d{9}$/)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

class RequestOtpDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @IsIn(['PARENT', 'ADMIN'])
  role!: 'PARENT' | 'ADMIN';
}

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/admins')
export class AdminIdentityController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async getAll() {
    return successResponse(await this.authService.getAdmins());
  }

  @Get('me')
  async getMe(@Req() req: any) {
    return successResponse(await this.authService.getAdmin(req.user.id));
  }

  @Post()
  async create(@Body() dto: CreateAdminDto) {
    return successResponse(await this.authService.createAdmin(dto));
  }

  @Patch(':adminId')
  async update(@Param('adminId') adminId: string, @Body() dto: UpdateAdminDto) {
    return successResponse(await this.authService.updateAdmin(adminId, dto));
  }

  @Post(':adminId/archive')
  async archive(@Param('adminId') adminId: string) {
    return successResponse(await this.authService.setAdminStatus(adminId, 'INACTIVE'));
  }

  @Post(':adminId/unarchive')
  async unarchive(@Param('adminId') adminId: string) {
    return successResponse(await this.authService.setAdminStatus(adminId, 'ACTIVE'));
  }
}

class VerifyAuthOtpDto extends RequestOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

type CookieRequest = FastifyRequest & {
  cookies: Record<string, string | undefined>;
};

type CookieReply = FastifyReply & {
  clearCookie(name: string, options?: CookieSerializeOptions): FastifyReply;
  setCookie(name: string, value: string, options?: CookieSerializeOptions): FastifyReply;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TrustedOriginGuard)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return successResponse(await this.authService.requestAuthOtp(dto.phoneNumber, dto.role));
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyAuthOtp(
    @Req() req: FastifyRequest,
    @Body() dto: VerifyAuthOtpDto,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceName: req.headers['user-agent']?.slice(0, 255),
    };
    const result = await this.authService.verifyAuthOtp(
      dto.phoneNumber,
      dto.code,
      dto.role,
      context,
    );
    this.setRefreshCookie(reply, result.refreshToken, result.user.role === 'ADMIN');
    this.setAccessCookie(reply, result.accessToken, result.user.role === 'ADMIN');
    return successResponse({
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  @Public()
  @UseGuards(TrustedOriginGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: CookieRequest, @Res({ passthrough: true }) reply: CookieReply) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new ValidationError('A refresh token is required.');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setRefreshCookie(reply, tokens.refreshToken, tokens.role === 'ADMIN');
    this.setAccessCookie(reply, tokens.accessToken, tokens.role === 'ADMIN');
    return successResponse({ accessToken: tokens.accessToken });
  }

  @UseGuards(AuthGuard, TrustedOriginGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) reply: CookieReply) {
    const userId = req.user?.id;
    if (userId && req.user?.sessionId) {
      await this.authService.logout(userId, req.user.sessionId);
    }
    reply.clearCookie('refresh_token', { path: '/api/v1/auth' });
    reply.clearCookie('access_token', { path: '/' });
    return successResponse({ loggedOut: true });
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return successResponse({ user: req.user });
  }

  private setRefreshCookie(reply: CookieReply, token: string, isAdmin = false) {
    const maxAge = isAdmin ? this.config.adminJwtRefreshTokenTtl : this.config.jwtRefreshTokenTtl;
    reply.setCookie('refresh_token', token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge,
    });
  }

  private setAccessCookie(reply: CookieReply, token: string, isAdmin = false) {
    const maxAge = isAdmin ? this.config.adminJwtAccessTokenTtl : this.config.jwtAccessTokenTtl;
    reply.setCookie('access_token', token, {
      httpOnly: true,
      secure: this.config.nodeEnv === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}
