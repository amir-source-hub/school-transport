import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { ConfigService } from '../../config/config.service';
import { PUBLIC_KEY } from '../../common/decorators';
import { JwtPayload } from '../../common/authentication.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type.');
      }

      (request as any).user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const auth = request.headers.authorization;
    if (auth) {
      const [type, token] = auth.split(' ');
      if (type === 'Bearer' && token) return token;
    }
    return (request as FastifyRequest & { cookies?: Record<string, string> }).cookies?.access_token;
  }
}
