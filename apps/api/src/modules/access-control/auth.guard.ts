import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { ConfigService } from '../../config/config.service';
import { PUBLIC_KEY } from '../../common/decorators';
import { JwtPayload } from '../../common/authentication.types';
import { DatabaseService } from '../../database/database.service';
import { adminUsers, authSessions, schoolManagerUsers, users } from '../../database/schemas';
import { and, eq, isNull, gt } from 'drizzle-orm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
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

      if (!payload.sid || !['PARENT', 'ADMIN', 'SCHOOL_MANAGER'].includes(payload.role)) {
        throw new UnauthorizedException('Invalid token.');
      }
      const [session] = await this.database.db
        .select({ id: authSessions.id })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, payload.sid),
            eq(authSessions.subjectId, payload.sub),
            eq(authSessions.role, payload.role),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!session) throw new UnauthorizedException('Invalid session.');

      const [account] =
        payload.role === 'ADMIN'
          ? await this.database.db
              .select({ status: adminUsers.status })
              .from(adminUsers)
              .where(eq(adminUsers.id, payload.sub))
              .limit(1)
          : payload.role === 'SCHOOL_MANAGER'
            ? await this.database.db
                .select({ status: schoolManagerUsers.status })
                .from(schoolManagerUsers)
                .where(eq(schoolManagerUsers.id, payload.sub))
                .limit(1)
            : await this.database.db
                .select({ status: users.accountStatus })
                .from(users)
                .where(eq(users.id, payload.sub))
                .limit(1);
      if (!account || account.status !== 'ACTIVE') {
        throw new UnauthorizedException('Inactive account.');
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
