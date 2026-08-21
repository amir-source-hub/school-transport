import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

@Injectable()
export class IdentityAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: Record<string, unknown>): Promise<string> {
    const headers = request.headers as Record<string, string | string[] | undefined> | undefined;
    const authorization = headers?.authorization;
    const bearer = Array.isArray(authorization) ? authorization[0] : authorization;

    // Authenticated users behind the same school/NAT must not consume one
    // another's quota. Only an irreversible fingerprint is used in the key.
    if (bearer?.startsWith('Bearer ') && bearer.length > 7) {
      const fingerprint = createHash('sha256').update(bearer).digest('hex').slice(0, 32);
      return `session:${fingerprint}`;
    }

    return super.getTracker(request);
  }
}
