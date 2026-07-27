import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { parents, schools, students, users } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { EditableStudentFields, parseEditableStudentFields } from './student-update';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class StudentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
  ) {}

  async getAllByFamily(userId: string) {
    return this.db.db
      .select({ ...getTableColumns(students), schoolName: schools.name })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(and(eq(students.userId, userId), eq(students.isActive, true)));
  }

  async getById(studentId: string, userId?: string) {
    const conditions = [eq(students.id, studentId)];
    if (userId) conditions.push(eq(students.userId, userId));
    const result = await this.db.db
      .select({ ...getTableColumns(students), schoolName: schools.name })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
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

  async getAllForAdmin() {
    const rows = await this.db.db
      .select({
        ...getTableColumns(students),
        schoolName: schools.name,
        username: users.username,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .innerJoin(users, eq(users.id, students.userId));

    const parentRows = await this.db.db
      .select()
      .from(parents);

    return rows.map((student) => {
      const familyParent = parentRows.find(
        (parent) => parent.userId === student.userId && parent.isPrimaryContact,
      ) ?? parentRows.find((parent) => parent.userId === student.userId);
      return {
        ...student,
        familyName: familyParent
          ? `${familyParent.firstName} ${familyParent.lastName}`
          : student.username,
      };
    });
  }

  async updateByAdmin(studentId: string, data: EditableStudentFields) {
    const student = await this.getById(studentId);
    return this.update(studentId, student.userId, data);
  }

  async createByAdmin(
    userId: string,
    data: Parameters<StudentsService['create']>[1],
  ) {
    const student = await this.create(userId, data);
    const familyParents = await this.db.db.select().from(parents).where(eq(parents.userId, userId));
    const primaryParent =
      familyParents.find((parent) => parent.isPrimaryContact) ?? familyParents[0];
    const familyName = primaryParent
      ? `${primaryParent.firstName} ${primaryParent.lastName}`
      : 'خانواده';
    await this.notifications.create({
      userId,
      notificationType: 'ADMIN_STUDENT_ADDED',
      title: 'دانش‌آموز به حساب خانواده افزوده شد',
      message: `مدیریت دانش‌آموز ${student.firstName} ${student.lastName} را به حساب خانواده ${familyName} و مدرسه ${student.schoolName} افزود. برای انتخاب سرویس، تکمیل نشانی، پذیرش قرارداد و پرداخت پیش‌پرداخت به بخش ثبت‌نام بروید.`,
      relatedEntityType: 'STUDENT',
      relatedEntityId: student.id,
    });
    return student;
  }

  async setActiveByAdmin(studentId: string, isActive: boolean) {
    await this.getById(studentId);
    await this.db.db
      .update(students)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(students.id, studentId));
    return this.getById(studentId);
  }
}
