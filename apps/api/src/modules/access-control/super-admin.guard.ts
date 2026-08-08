import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { adminUsers } from '../../database/schemas';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly database: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as FastifyRequest & { user?: { id: string; role: string } }).user;
    if (!user || user.role !== 'ADMIN') throw new ForbiddenException('Access denied.');
    const [admin] = await this.database.db
      .select({ isSuperAdmin: adminUsers.isSuperAdmin })
      .from(adminUsers)
      .where(eq(adminUsers.id, user.id))
      .limit(1);
    if (!admin?.isSuperAdmin) throw new ForbiddenException('Super-administrator access required.');
    return true;
  }
}
