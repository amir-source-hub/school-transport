import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class TrustedOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const requestOrigin = this.resolveOrigin(request.headers.origin, request.headers.referer);

    if (!requestOrigin || !this.config.corsOrigins.includes(requestOrigin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }

    return true;
  }

  private resolveOrigin(origin?: string, referer?: string): string | undefined {
    if (origin) return this.parseOrigin(origin);
    if (referer) return this.parseOrigin(referer);
    return undefined;
  }

  private parseOrigin(value: string): string | undefined {
    try {
      return new URL(value).origin;
    } catch {
      return undefined;
    }
  }
}
