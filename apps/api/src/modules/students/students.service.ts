import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { students } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { EditableStudentFields, parseEditableStudentFields } from './student-update';

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  async getAllByFamily(userId: string) {
    return this.db.db
      .select()
      .from(students)
      .where(and(eq(students.userId, userId), eq(students.isActive, true)));
  }

  async getById(studentId: string, userId?: string) {
    const conditions = [eq(students.id, studentId)];
    if (userId) conditions.push(eq(students.userId, userId));
    const result = await this.db.db
      .select()
      .from(students)
      .where(and(...conditions))
      .limit(1);
    if (result.length === 0) throw new NotFoundError('Student', studentId);
    return result[0];
  }

  async create(
    userId: string,
    data: {
      schoolId: string;
      firstName: string;
      lastName: string;
      nationalId: string;
      birthDate?: string;
      gender?: string;
      grade: string;
      className?: string;
    },
  ) {
    const existing = await this.db.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.nationalId, data.nationalId))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(
        'DUPLICATE_NATIONAL_ID',
        'A student with this national ID already exists.',
      );
    }

    const id = generateId();
    await this.db.db.insert(students).values({
      id,
      userId,
      schoolId: data.schoolId,
      firstName: data.firstName,
      lastName: data.lastName,
      nationalId: data.nationalId,
      birthDate: data.birthDate || null,
      gender: data.gender || null,
      grade: data.grade || null,
      className: data.className || null,
    });

    return this.getById(id);
  }

  async update(studentId: string, userId: string, data: EditableStudentFields) {
    await this.getById(studentId, userId);
    const editableFields = parseEditableStudentFields(data);
    await this.db.db
      .update(students)
      .set({ ...editableFields, updatedAt: new Date() })
      .where(eq(students.id, studentId));
    return this.getById(studentId);
  }

  async archive(studentId: string, userId: string) {
    await this.getById(studentId, userId);
    await this.db.db
      .update(students)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(students.id, studentId));
  }
}
