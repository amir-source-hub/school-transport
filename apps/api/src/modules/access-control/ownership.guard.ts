import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNERSHIP_KEY = 'ownership';
export type OwnershipCheck = (
  user: { id: string; role: string },
  params: Record<string, string>,
) => boolean | Promise<boolean>;

export const Ownership = (check: OwnershipCheck) => SetMetadata(OWNERSHIP_KEY, check);

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const check = this.reflector.getAllAndOverride<OwnershipCheck>(OWNERSHIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!check) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const params = request.params as Record<string, string>;

    const result = await check(user, params);
    if (!result) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
