import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { concatMap, from, type Observable } from 'rxjs';
import type { FastifyRequest } from 'fastify';
import { AUDIT_PORT, type AuditPort } from './audit.port';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuditableRequest = FastifyRequest & {
  user?: { id: string; role: 'PARENT' | 'ADMIN' };
  onboarding?: { userId: string };
  params?: Record<string, unknown>;
};

@Injectable()
export class MutationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MutationAuditInterceptor.name);

  constructor(@Inject(AUDIT_PORT) private readonly audit: AuditPort) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditableRequest>();
    if (!MUTATION_METHODS.has(request.method.toUpperCase())) return next.handle();
    const actorId = request.user?.id ?? request.onboarding?.userId;
    if (!actorId) return next.handle();

    return next.handle().pipe(
      concatMap((value) =>
        from(
          this.recordMutation(request, actorId)
            .catch((error: unknown) => {
              this.logger.error(
                `Mutation audit backstop failed for ${request.method} ${request.url}.`,
                error instanceof Error ? error.stack : undefined,
              );
            })
            .then(() => value),
        ),
      ),
    );
  }

  private async recordMutation(request: AuditableRequest, actorId: string) {
    const route = request.routeOptions?.url ?? new URL(request.url, 'http://local').pathname;
    const entityType =
      route
        .split('/')
        .filter(Boolean)
        .find((segment) => !['api', 'v1', 'admin', 'onboarding'].includes(segment))
        ?.replace(/[^a-z0-9]+/gi, '_')
        .toUpperCase()
        .slice(0, 50) ?? 'HTTP_MUTATION';
    const entityId = Object.values(request.params ?? {}).find(
      (value): value is string => typeof value === 'string' && UUID.test(value),
    );
    await this.audit.record({
      actorType: request.user?.role ?? 'PARENT',
      actorId,
      action: `HTTP_${request.method.toUpperCase()}_COMPLETED`,
      entityType,
      entityId,
      ipAddress: request.ip,
    });
  }
}
