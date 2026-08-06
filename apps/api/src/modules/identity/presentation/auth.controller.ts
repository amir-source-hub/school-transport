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
  ParseUUIDPipe,
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
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeIranianDigits } from '../../../common/iranian-national-id';
import { AuthenticatedRequest } from '../../../common/http-request';

const trimmed = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const digits = ({ value }: { value: unknown }) => typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;

export class CreateAdminDto {
  @Transform(trimmed)
  @IsString()
  @Length(3, 100)
  username!: string;

  @IsString()
  @Length(1, 100)
  @Transform(trimmed)
  firstName!: string;

  @IsString()
  @Length(1, 100)
  @Transform(trimmed)
  lastName!: string;

@Transform(digits)
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateAdminDto {
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
  @Transform(digits)
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  password?: string;
}

export class AdminPasswordChallengeDto {
  @Transform(trimmed)
  @IsString()
  @Length(3, 100)
  username!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

export class AdminOtpVerificationDto {
  @IsString()
  @Length(16, 256)
  challengeId!: string;

  @Transform(digits)
  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}

export class RequestOtpDto {
  @Transform(digits)
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;

  @IsOptional()
  @IsIn(['PARENT'])
  role?: 'PARENT';
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
  async getMe(@Req() req: AuthenticatedRequest) {
    return successResponse(await this.authService.getAdmin(req.user.id));
  }

@Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateAdminDto) {
    return successResponse(await this.authService.createAdmin(dto));
  }

  @Patch(':adminId')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('adminId', new ParseUUIDPipe()) adminId: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return successResponse(
      await this.authService.updateAdmin(adminId, dto, { id: req.user.id, ip: req.ip }),
    );
  }

  @Post(':adminId/archive')
  async archive(
    @Req() req: AuthenticatedRequest,
    @Param('adminId', new ParseUUIDPipe()) adminId: string,
  ) {
    return successResponse(
      await this.authService.setAdminStatus(adminId, 'INACTIVE', {
        id: req.user.id,
        ip: req.ip,
      }),
    );
  }

  @Post(':adminId/unarchive')
  async unarchive(
    @Req() req: AuthenticatedRequest,
    @Param('adminId', new ParseUUIDPipe()) adminId: string,
  ) {
    return successResponse(
      await this.authService.setAdminStatus(adminId, 'ACTIVE', {
        id: req.user.id,
        ip: req.ip,
      }),
    );
  }
}

export class VerifyAuthOtpDto extends RequestOtpDto {
  @Transform(digits)
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
  async requestOtp(@Req() req: FastifyRequest, @Body() dto: RequestOtpDto) {
    return successResponse(
      await this.authService.requestAuthOtp(dto.phoneNumber, dto.role ?? 'PARENT', req.ip),
    );
  }

  @Public()
  @Post('admin/password-challenge')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TrustedOriginGuard)
  async passwordChallenge(
    @Req() req: FastifyRequest,
    @Body() dto: AdminPasswordChallengeDto,
  ) {
    return successResponse(
      await this.authService.createAdminChallenge(dto.username, dto.password, req.ip),
    );
  }

  @Public()
  @Post('admin/verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TrustedOriginGuard)
  async verifyAdminOtp(
    @Req() req: FastifyRequest,
    @Body() dto: AdminOtpVerificationDto,
    @Res({ passthrough: true }) reply: CookieReply,
  ) {
    const context = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceName: req.headers['user-agent']?.slice(0, 255),
    };
    const result = await this.authService.verifyAdminOtp(dto.challengeId, dto.code, context);
    this.setRefreshCookie(reply, result.refreshToken, true);
    this.setAccessCookie(reply, result.accessToken, true);
    return successResponse({
      user: result.user,
      accessToken: result.accessToken,
    });
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
    if (!refreshToken || refreshToken.length > 4096) {
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
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) reply: CookieReply) {
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
  async me(@Req() req: AuthenticatedRequest) {
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
