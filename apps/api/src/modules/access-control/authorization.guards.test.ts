import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../config/config.service';
import { AuthGuard } from './auth.guard';
import { OwnershipCheck, OwnershipGuard } from './ownership.guard';
import { RolesGuard } from './roles.guard';

function contextWithRequest(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => vi.fn(),
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function reflectorReturning<T>(value: T): Reflector {
  return { getAllAndOverride: vi.fn().mockReturnValue(value) } as unknown as Reflector;
}

describe('AuthGuard', () => {
  const config = { jwtSecret: 'test-jwt-secret' } as ConfigService;

  it('allows explicitly public routes without a token', async () => {
    const jwt = { verifyAsync: vi.fn() } as unknown as JwtService;
    const guard = new AuthGuard(reflectorReturning(true), jwt, config);

    await expect(guard.canActivate(contextWithRequest({ headers: {} }))).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects protected routes without a bearer token', async () => {
    const guard = new AuthGuard(
      reflectorReturning(false),
      { verifyAsync: vi.fn() } as unknown as JwtService,
      config,
    );

    await expect(guard.canActivate(contextWithRequest({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh tokens used as access tokens', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1', role: 'PARENT', type: 'refresh' }),
    } as unknown as JwtService;
    const guard = new AuthGuard(reflectorReturning(false), jwt, config);

    await expect(
      guard.canActivate(contextWithRequest({ headers: { authorization: 'Bearer refresh-token' } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('masks expired or invalid token verification failures', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockRejectedValue(new Error('jwt expired at internal timestamp')),
    } as unknown as JwtService;
    const guard = new AuthGuard(reflectorReturning(false), jwt, config);

    await expect(
      guard.canActivate(contextWithRequest({ headers: { authorization: 'Bearer expired' } })),
    ).rejects.toThrow('Invalid or expired token.');
  });

  it('attaches the verified user identity and role', async () => {
    const request = { headers: { authorization: 'Bearer access-token' } } as Record<
      string,
      unknown
    >;
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1', role: 'PARENT', type: 'access' }),
    } as unknown as JwtService;
    const guard = new AuthGuard(reflectorReturning(false), jwt, config);

    await expect(guard.canActivate(contextWithRequest(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', role: 'PARENT' });
  });
});

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextWithRequest({}))).toBe(true);
  });

  it('rejects missing users and parent access to admin routes', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(() => guard.canActivate(contextWithRequest({}))).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(contextWithRequest({ user: { id: 'parent-1', role: 'PARENT' } })),
    ).toThrow(ForbiddenException);
  });

  it('allows an admin on an admin route', () => {
    const guard = new RolesGuard(reflectorReturning(['ADMIN']));
    expect(guard.canActivate(contextWithRequest({ user: { id: 'admin-1', role: 'ADMIN' } }))).toBe(
      true,
    );
  });
});

describe('OwnershipGuard', () => {
  it('allows routes without an ownership policy', async () => {
    const guard = new OwnershipGuard(reflectorReturning(undefined));
    await expect(guard.canActivate(contextWithRequest({}))).resolves.toBe(true);
  });

  it('rejects unauthenticated and cross-family access', async () => {
    const check = vi.fn().mockReturnValue(false) as OwnershipCheck;
    const guard = new OwnershipGuard(reflectorReturning(check));

    await expect(guard.canActivate(contextWithRequest({ params: {} }))).rejects.toThrow(
      ForbiddenException,
    );
    expect(check).not.toHaveBeenCalled();

    await expect(
      guard.canActivate(
        contextWithRequest({
          user: { id: 'family-1', role: 'PARENT' },
          params: { studentId: 'other-family-student' },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('passes authenticated identity and URL parameters to an async ownership policy', async () => {
    const check = vi.fn().mockResolvedValue(true) as OwnershipCheck;
    const guard = new OwnershipGuard(reflectorReturning(check));
    const user = { id: 'family-1', role: 'PARENT' };
    const params = { studentId: 'owned-student' };

    await expect(guard.canActivate(contextWithRequest({ user, params }))).resolves.toBe(true);
    expect(check).toHaveBeenCalledWith(user, params);
  });
});
