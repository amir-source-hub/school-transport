import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { isPast } from 'date-fns';
import { DatabaseService } from '../../database/database.service';
import { onboardingSessions } from '../../database/schemas';

export interface OnboardingContext {
  id: string;
  userId: string;
  phoneNumber: string;
  currentStep: string | null;
  expiresAt: Date;
}

@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('An onboarding session is required.');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const [session] = await this.database.db
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.onboardingTokenHash, tokenHash),
          eq(onboardingSessions.status, 'PENDING'),
        ),
      )
      .limit(1);

    if (!session || isPast(session.expiresAt)) {
      throw new UnauthorizedException('Invalid or expired onboarding session.');
    }

    (request as any).onboarding = {
      id: session.id,
      userId: session.userId,
      phoneNumber: session.phoneNumber,
      currentStep: session.currentStep,
      expiresAt: session.expiresAt,
    } satisfies OnboardingContext;
    (request as any).user = { id: session.userId, role: 'PARENT', sessionId: null };
    return true;
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const auth = request.headers.authorization;
    if (auth) {
      const [type, token] = auth.split(' ');
      if (type === 'Bearer' && token) return token;
    }
    return (request as FastifyRequest & { cookies?: Record<string, string> }).cookies
      ?.onboarding_token;
  }
}
