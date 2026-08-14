import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { schoolManagerAssignments, students } from '../../database/schemas';
import { AuthorizationError } from '../../common/errors';

/**
 * Resolves which schools an authenticated school manager may access.
 * Permissions are always derived from active assignments; a schoolId
 * supplied by the browser is never trusted without this check.
 */
@Injectable()
export class SchoolManagerScopeService {
  constructor(@Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService) {}

  async getActiveSchoolIds(managerId: string): Promise<string[]> {
    const rows = await this.db.db
      .select({ schoolId: schoolManagerAssignments.schoolId })
      .from(schoolManagerAssignments)
      .where(
        and(
          eq(schoolManagerAssignments.managerUserId, managerId),
          eq(schoolManagerAssignments.status, 'ACTIVE'),
        ),
      )
      .orderBy(schoolManagerAssignments.createdAt);
    return rows.map((row) => row.schoolId);
  }

  /** Returns the first active school as the primary school for the shell header. */
  async resolvePrimarySchoolId(managerId: string): Promise<string> {
    const schoolIds = await this.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0) {
      throw new AuthorizationError('مدیر مدرسه به هیچ مدرسه‌ای متصل نیست.');
    }
    return schoolIds[0];
  }

  /** Guards a manager request that targets a single school resource. */
  async assertSchoolInScope(schoolId: string, managerId: string): Promise<void> {
    const schoolIds = await this.getActiveSchoolIds(managerId);
    if (!schoolIds.includes(schoolId)) {
      throw new AuthorizationError('Access denied.');
    }
  }

  /** Confirms a student belongs to one of the manager's schools (rejects IDOR). */
  async assertStudentInScope(studentId: string, managerId: string): Promise<void> {
    const schoolIds = await this.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0) throw new AuthorizationError('Access denied.');
    const [row] = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), inArray(students.schoolId, schoolIds)))
      .limit(1);
    if (!row) throw new AuthorizationError('Access denied.');
  }
}
