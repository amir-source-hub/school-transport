import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { normalizeIranianDigits } from '../../common/iranian-national-id';
import { AuthorizationError } from '../../common/errors';
import { ConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';
import {
  contracts,
  emergencyContacts,
  feedbackSubmissions,
  familyAddresses,
  parents,
  registrationPrices,
  schoolManagerUsers,
  schools,
  serviceRegistrations,
  studentPhotoUploads,
  students,
} from '../../database/schemas';
import { SchoolManagerScopeService } from '../access-control/school-manager-scope.service';
import type { ManagerStudentListQueryDto } from './school-manager.dto';

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  ابتدایی: 'ابتدایی',
  'متوسطه اول': 'متوسطه اول',
  'متوسطه دوم': 'متوسطه دوم',
};

export function mapEducationLevel(className: string | null): string | null {
  if (!className) return null;
  return EDUCATION_LEVEL_MAP[className] ?? className;
}

@Injectable()
export class SchoolManagersService {
  constructor(
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(forwardRef(() => ConfigService)) private readonly config: ConfigService,
    private readonly scope: SchoolManagerScopeService,
  ) {}

  async getDashboard(managerId: string) {
    const schoolIds = await this.scope.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0)
      throw new AuthorizationError('مدیر مدرسه به هیچ مدرسه‌ای متصل نیست.');
    const primarySchoolId = schoolIds[0];

    const [schoolRow] = await this.db.db
      .select()
      .from(schools)
      .where(eq(schools.id, primarySchoolId))
      .limit(1);
    const [managerRow] = await this.db.db
      .select({
        id: schoolManagerUsers.id,
        firstName: schoolManagerUsers.firstName,
        lastName: schoolManagerUsers.lastName,
        username: schoolManagerUsers.username,
        email: schoolManagerUsers.email,
        mustChangeCredentials: schoolManagerUsers.mustChangeCredentials,
      })
      .from(schoolManagerUsers)
      .where(eq(schoolManagerUsers.id, managerId))
      .limit(1);
    if (!schoolRow || !managerRow) {
      throw new AuthorizationError('حساب مدیر مدرسه در دسترس نیست.');
    }

    const studentWhere = inArray(students.schoolId, schoolIds);
    const [studentCountRow] = await this.db.db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${students.isActive})::int`,
      })
      .from(students)
      .where(studentWhere);

    const approvedPhotoSubquery = this.db.db
      .select({ id: studentPhotoUploads.id })
      .from(studentPhotoUploads)
      .where(
        and(
          eq(studentPhotoUploads.status, 'APPROVED'),
          eq(studentPhotoUploads.studentId, students.id),
        ),
      );
    const [photoCountRow] = await this.db.db
      .select({ withPhoto: sql<number>`count(*)::int` })
      .from(students)
      .where(and(studentWhere, exists(approvedPhotoSubquery)));

    const registrationRows = await this.db.db
      .select({
        registrationStatus: serviceRegistrations.registrationStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(inArray(students.schoolId, schoolIds))
      .groupBy(serviceRegistrations.registrationStatus);

    const recentRows = await this.db.db
      .select({
        id: serviceRegistrations.id,
        registrationStatus: serviceRegistrations.registrationStatus,
        serviceType: serviceRegistrations.serviceType,
        academicYear: serviceRegistrations.academicYear,
        submittedAt: serviceRegistrations.submittedAt,
        reviewedAt: serviceRegistrations.reviewedAt,
        createdAt: serviceRegistrations.createdAt,
        studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
      })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(inArray(students.schoolId, schoolIds))
      .orderBy(desc(serviceRegistrations.createdAt), desc(serviceRegistrations.id))
      .limit(6);

    const [unansweredFeedbackRow] = await this.db.db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackSubmissions)
      .where(
        and(
          eq(feedbackSubmissions.senderType, 'SCHOOL_MANAGER'),
          eq(feedbackSubmissions.managerUserId, managerId),
          eq(feedbackSubmissions.status, 'NEW'),
        ),
      );

    return {
      school: {
        id: schoolRow.id,
        name: schoolRow.name,
        schoolType: schoolRow.schoolType,
        genderType: schoolRow.genderType,
        province: schoolRow.province,
        city: schoolRow.city,
        district: schoolRow.district,
        educationLevels: (schoolRow.educationOptions ?? []).map((option) => option.level),
      },
      manager: {
        id: managerRow.id,
        firstName: managerRow.firstName,
        lastName: managerRow.lastName,
        username: managerRow.username,
        mustChangeCredentials: managerRow.mustChangeCredentials,
      },
      counts: {
        totalStudents: studentCountRow?.total ?? 0,
        activeStudents: studentCountRow?.active ?? 0,
        studentsWithApprovedPhoto: photoCountRow?.withPhoto ?? 0,
        studentsWithoutApprovedPhoto:
          (studentCountRow?.total ?? 0) - (photoCountRow?.withPhoto ?? 0),
      },
      registrations: {
        byStatus: Object.fromEntries(
          registrationRows.map((row) => [row.registrationStatus, row.count]),
        ),
      },
      recentActivity: recentRows,
      unansweredFeedback: unansweredFeedbackRow?.count ?? 0,
      onlineControlStatus: 'PREPARING',
      driverPreview: {
        available: this.config.featureManagerDriverPreview,
        experimental: true,
      },
    };
  }

  async getStudents(managerId: string, query: ManagerStudentListQueryDto) {
    const schoolIds = await this.scope.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0)
      throw new AuthorizationError('مدیر مدرسه به هیچ مدرسه‌ای متصل نیست.');

    const conditions: SQL[] = [inArray(students.schoolId, schoolIds)];
    if (query.query) {
      const term = normalizeIranianDigits(query.query.trim()).replace(/[%_\\]/g, (m) => `\\${m}`);
      const pattern = `%${term}%`;
      conditions.push(
        or(
          ilike(students.firstName, pattern),
          ilike(students.lastName, pattern),
          ilike(students.studentCode, pattern),
          ilike(students.nationalId, pattern),
        ) as SQL,
      );
    }
    if (query.educationLevel) conditions.push(eq(students.className, query.educationLevel));
    if (query.grade) conditions.push(eq(students.grade, query.grade));
    if (query.fieldOfStudy) conditions.push(eq(students.fieldOfStudy, query.fieldOfStudy));

    const approvedPhotoSubquery = this.db.db
      .select({ id: studentPhotoUploads.id })
      .from(studentPhotoUploads)
      .where(
        and(
          eq(studentPhotoUploads.status, 'APPROVED'),
          eq(studentPhotoUploads.studentId, students.id),
        ),
      );
    if (query.photoStatus === 'with_photo') conditions.push(exists(approvedPhotoSubquery));
    if (query.photoStatus === 'without_photo')
      conditions.push(sql`not (${exists(approvedPhotoSubquery)})`);

    const registrationFilter = (column: SQLWrapper, value: string) =>
      exists(
        this.db.db
          .select({ id: serviceRegistrations.id })
          .from(serviceRegistrations)
          .where(and(eq(serviceRegistrations.studentId, students.id), eq(column as never, value))),
      );
    if (query.serviceType)
      conditions.push(registrationFilter(serviceRegistrations.serviceType, query.serviceType));
    if (query.registrationStatus)
      conditions.push(
        registrationFilter(serviceRegistrations.registrationStatus, query.registrationStatus),
      );

    const where = and(...conditions);
    const [countRow] = await this.db.db
      .select({ total: sql<number>`count(*)::int` })
      .from(students)
      .where(where);

    const orderBy = this.buildStudentOrderBy(query.sortBy, query.sortOrder);
    const rows = await this.db.db
      .select({
        id: students.id,
        userId: students.userId,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalId: students.nationalId,
        birthDate: students.birthDate,
        gender: students.gender,
        grade: students.grade,
        className: students.className,
        studentCode: students.studentCode,
        isActive: students.isActive,
        createdAt: students.createdAt,
        schoolName: schools.name,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(where)
      .orderBy(...orderBy)
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const studentIds = rows.map((row) => row.id);
    const userIds = rows.map((row) => row.userId);

    const [registrationRows, parentRows, photoRows] = await Promise.all([
      studentIds.length
        ? this.db.db
            .select()
            .from(serviceRegistrations)
            .where(inArray(serviceRegistrations.studentId, studentIds))
            .orderBy(desc(serviceRegistrations.createdAt), desc(serviceRegistrations.id))
        : [],
      userIds.length
        ? this.db.db
            .select()
            .from(parents)
            .where(inArray(parents.userId, userIds))
            .orderBy(desc(parents.isPrimaryContact), desc(parents.createdAt))
        : [],
      studentIds.length
        ? this.db.db
            .select({ studentId: studentPhotoUploads.studentId })
            .from(studentPhotoUploads)
            .where(
              and(
                eq(studentPhotoUploads.status, 'APPROVED'),
                inArray(studentPhotoUploads.studentId, studentIds),
              ),
            )
        : [],
    ]);

    const latestByStudent = new Map<string, (typeof registrationRows)[number]>();
    for (const row of registrationRows) {
      if (!latestByStudent.has(row.studentId)) latestByStudent.set(row.studentId, row);
    }
    const guardianByUser = new Map<string, string>();
    for (const parent of parentRows) {
      if (!guardianByUser.has(parent.userId)) {
        guardianByUser.set(parent.userId, `${parent.firstName} ${parent.lastName}`);
      }
    }
    const photoSet = new Set(photoRows.map((row) => row.studentId));

    const items = rows.map((row) => {
      const registration = latestByStudent.get(row.id);
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        educationLevel: mapEducationLevel(row.className),
        grade: row.grade,
        studentCode: row.studentCode,
        nationalId: row.nationalId,
        guardianName: guardianByUser.get(row.userId) ?? null,
        isActive: row.isActive,
        schoolName: row.schoolName,
        hasApprovedPhoto: photoSet.has(row.id),
        createdAt: row.createdAt,
        registration: registration
          ? {
              registrationStatus: registration.registrationStatus,
              serviceType: registration.serviceType,
              academicYear: registration.academicYear,
              submittedAt: registration.submittedAt,
            }
          : null,
      };
    });

    if (query.sortBy === 'registrationStatus') {
      items.sort((a, b) => {
        const statusA = a.registration?.registrationStatus ?? '';
        const statusB = b.registration?.registrationStatus ?? '';
        const result = statusA.localeCompare(statusB);
        return query.sortOrder === 'asc' ? result : -result;
      });
    }

    return { items, total: countRow?.total ?? 0 };
  }

  async getStudentDetail(managerId: string, studentId: string) {
    const schoolIds = await this.scope.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0)
      throw new AuthorizationError('مدیر مدرسه به هیچ مدرسه‌ای متصل نیست.');

    const [studentRow] = await this.db.db
      .select({
        id: students.id,
        userId: students.userId,
        schoolId: students.schoolId,
        firstName: students.firstName,
        lastName: students.lastName,
        nationalId: students.nationalId,
        birthDate: students.birthDate,
        fatherName: students.fatherName,
        gender: students.gender,
        phoneNumber: students.phoneNumber,
        grade: students.grade,
        className: students.className,
        fieldOfStudy: students.fieldOfStudy,
        studentCode: students.studentCode,
        isActive: students.isActive,
        createdAt: students.createdAt,
        schoolName: schools.name,
        schoolType: schools.schoolType,
      })
      .from(students)
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(and(eq(students.id, studentId), inArray(students.schoolId, schoolIds)))
      .limit(1);
    if (!studentRow) throw new AuthorizationError('Access denied.');

    const [parentRows, addressRows, emergencyRows, registrationRows, photoRow] = await Promise.all([
      this.db.db
        .select({
          id: parents.id,
          parentType: parents.parentType,
          firstName: parents.firstName,
          lastName: parents.lastName,
          nationalId: parents.nationalId,
          phoneNumber: parents.phoneNumber,
          homePhone: parents.homePhone,
          relationshipType: parents.relationshipType,
          relationshipDescription: parents.relationshipDescription,
          isPrimaryContact: parents.isPrimaryContact,
        })
        .from(parents)
        .where(eq(parents.userId, studentRow.userId))
        .orderBy(desc(parents.isPrimaryContact), desc(parents.createdAt)),
      this.db.db
        .select()
        .from(familyAddresses)
        .where(eq(familyAddresses.userId, studentRow.userId))
        .orderBy(desc(familyAddresses.isActive), desc(familyAddresses.createdAt)),
      this.db.db
        .select()
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, studentRow.userId))
        .orderBy(desc(emergencyContacts.isActive), desc(emergencyContacts.createdAt)),
      this.db.db
        .select()
        .from(serviceRegistrations)
        .where(eq(serviceRegistrations.studentId, studentId))
        .orderBy(desc(serviceRegistrations.createdAt), desc(serviceRegistrations.id)),
      this.db.db
        .select({ id: studentPhotoUploads.id })
        .from(studentPhotoUploads)
        .where(
          and(
            eq(studentPhotoUploads.studentId, studentId),
            eq(studentPhotoUploads.status, 'APPROVED'),
          ),
        )
        .limit(1),
    ]);

    const latestRegistration = registrationRows[0] ?? null;
    let enrollmentSummary: unknown = null;
    if (latestRegistration) {
      const [contractRow, priceRow] = await Promise.all([
        this.db.db
          .select()
          .from(contracts)
          .where(eq(contracts.registrationId, latestRegistration.id))
          .orderBy(desc(contracts.versionNumber))
          .limit(1),
        this.db.db
          .select()
          .from(registrationPrices)
          .where(eq(registrationPrices.registrationId, latestRegistration.id))
          .orderBy(desc(registrationPrices.versionNumber))
          .limit(1),
      ]);
      enrollmentSummary = {
        registrationId: latestRegistration.id,
        registrationStatus: latestRegistration.registrationStatus,
        academicYear: latestRegistration.academicYear,
        serviceType: latestRegistration.serviceType,
        requestedStartDate: latestRegistration.requestedStartDate,
        submittedAt: latestRegistration.submittedAt,
        reviewedAt: latestRegistration.reviewedAt,
        contract: contractRow[0]
          ? {
              id: contractRow[0].id,
              contractNumber: contractRow[0].contractNumber,
              contractStatus: contractRow[0].contractStatus,
              acceptedAt: contractRow[0].acceptedAt,
            }
          : null,
        price: priceRow[0]
          ? {
              id: priceRow[0].id,
              totalAmount: priceRow[0].totalAmount,
              prepaymentAmount: priceRow[0].prepaymentAmount,
              installmentCount: priceRow[0].installmentCount,
              priceStatus: priceRow[0].priceStatus,
            }
          : null,
      };
    }

    return {
      id: studentRow.id,
      firstName: studentRow.firstName,
      lastName: studentRow.lastName,
      nationalId: studentRow.nationalId,
      birthDate: studentRow.birthDate,
      fatherName: studentRow.fatherName,
      gender: studentRow.gender,
      phoneNumber: studentRow.phoneNumber,
      educationLevel: mapEducationLevel(studentRow.className),
      grade: studentRow.grade,
      fieldOfStudy: studentRow.fieldOfStudy,
      studentCode: studentRow.studentCode,
      isActive: studentRow.isActive,
      createdAt: studentRow.createdAt,
      school: {
        id: studentRow.schoolId ?? null,
        name: studentRow.schoolName,
        schoolType: studentRow.schoolType,
      },
      guardians: parentRows.map((parent) => ({
        id: parent.id,
        parentType: parent.parentType,
        name: `${parent.firstName} ${parent.lastName}`,
        nationalId: parent.nationalId,
        phoneNumber: parent.phoneNumber,
        homePhone: parent.homePhone,
        relationshipType: parent.relationshipType,
        relationshipDescription: parent.relationshipDescription,
        isPrimaryContact: parent.isPrimaryContact,
      })),
      emergencyContacts: emergencyRows.map((contact) => ({
        id: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
        secondaryPhoneNumber: contact.secondaryPhoneNumber,
        isActive: contact.isActive,
      })),
      addresses: addressRows.map((address) => ({
        id: address.id,
        title: address.title,
        province: address.province,
        city: address.city,
        district: address.district,
        streetAddress: address.streetAddress,
        postalCode: address.postalCode,
        latitude: address.latitude,
        longitude: address.longitude,
        isActive: address.isActive,
      })),
      hasApprovedPhoto: Boolean(photoRow[0]),
      enrollmentSummary,
    };
  }

  async getSettings(managerId: string) {
    const schoolIds = await this.scope.getActiveSchoolIds(managerId);
    if (schoolIds.length === 0)
      throw new AuthorizationError('مدیر مدرسه به هیچ مدرسه‌ای متصل نیست.');
    const primarySchoolId = schoolIds[0];

    const [managerRow] = await this.db.db
      .select({
        id: schoolManagerUsers.id,
        firstName: schoolManagerUsers.firstName,
        lastName: schoolManagerUsers.lastName,
        username: schoolManagerUsers.username,
        phoneNumber: schoolManagerUsers.phoneNumber,
        email: schoolManagerUsers.email,
        mustChangeCredentials: schoolManagerUsers.mustChangeCredentials,
        credentialsChangedAt: schoolManagerUsers.credentialsChangedAt,
        lastLoginAt: schoolManagerUsers.lastLoginAt,
      })
      .from(schoolManagerUsers)
      .where(eq(schoolManagerUsers.id, managerId))
      .limit(1);
    if (!managerRow) throw new AuthorizationError('حساب مدیر مدرسه در دسترس نیست.');

    const schoolRows = await this.db.db
      .select()
      .from(schools)
      .where(inArray(schools.id, schoolIds))
      .orderBy(schools.createdAt);

    return {
      manager: {
        id: managerRow.id,
        firstName: managerRow.firstName,
        lastName: managerRow.lastName,
        username: managerRow.username,
        phoneNumber: managerRow.phoneNumber,
        email: managerRow.email,
        mustChangeCredentials: managerRow.mustChangeCredentials,
        credentialsChangedAt: managerRow.credentialsChangedAt,
        lastLoginAt: managerRow.lastLoginAt,
      },
      schools: schoolRows.map((school) => ({
        id: school.id,
        name: school.name,
        schoolType: school.schoolType,
        genderType: school.genderType,
        province: school.province,
        city: school.city,
        district: school.district,
        address: school.address,
        phoneNumber: school.phoneNumber,
        openingTime: school.openingTime,
        closingTime: school.closingTime,
        closingTimes: school.closingTimes,
        latitude: school.latitude,
        longitude: school.longitude,
        educationLevels: (school.educationOptions ?? []).map((option) => ({
          level: option.level,
          grades: option.grades,
        })),
        isActive: school.isActive,
      })),
      primarySchoolId,
    };
  }

  private buildStudentOrderBy(
    sortBy: ManagerStudentListQueryDto['sortBy'],
    sortOrder: ManagerStudentListQueryDto['sortOrder'],
  ): SQL[] {
    const direction = sql.raw(sortOrder === 'asc' ? 'asc' : 'desc');
    if (sortBy === 'name') {
      return [sql`${students.firstName} ${direction}`, sql`${students.lastName} ${direction}`];
    }
    if (sortBy === 'nationalId') return [sql`${students.nationalId} ${direction}`];
    if (sortBy === 'studentCode') return [sql`${students.studentCode} ${direction}`];
    if (sortBy === 'educationLevel') return [sql`${students.className} ${direction}`];
    if (sortBy === 'grade') return [sql`${students.grade} ${direction}`, desc(students.id)];
    return [sql`${students.createdAt} ${direction}`, desc(students.id)];
  }
}
