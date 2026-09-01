import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, max, or, sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../common/errors';
import { AUDIT_PORT, type AuditPort } from '../../common/audit.port';
import { isIranianNationalId } from '../../common/iranian-national-id';
import { DatabaseService } from '../../database/database.service';
import {
  driverDocumentUploads,
  drivers,
  transportDocuments,
  vehicles,
  transportServiceRuns,
  transportServiceRunStudents,
  students,
  schools,
  users,
  familyAddresses,
  parents,
} from '../../database/schemas';
import { S3_CLIENT, type S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { AssignDriverToStudentDto, DriverDocumentUploadDto, DriverEnrollmentDto, UpdateDriverProfileDto } from './driver-enrollment.dto';

const CONTRACT_VERSION = 'driver-v1';
const CAPACITY: Record<string, number> = { CAR: 4, VAN: 10, MINIBUS: 16, BUS: 30 };

@Injectable()
export class DriverEnrollmentService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(S3_CLIENT) private readonly storage: S3Storage,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    private readonly notifications: InAppNotificationService,
  ) {}

  async authorizeUpload(userId: string, input: DriverDocumentUploadDto, ipAddress?: string) {
    const extension = input.mimeType === 'image/png' ? 'png' : 'jpg';
    const id = randomUUID();
    const objectKey = `driver-enrollment/raw/${userId}/${id}.${extension}`;
    await this.database.db.insert(driverDocumentUploads).values({
      id,
      userId,
      documentType: input.documentType,
      objectKey,
      mimeType: input.mimeType,
      declaredSize: input.size,
    });
    await this.audit.record({
      actorType: 'DRIVER',
      actorId: userId,
      action: 'DRIVER_DOCUMENT_UPLOAD_AUTHORIZED',
      entityType: 'DRIVER_DOCUMENT_UPLOAD',
      entityId: id,
      newValues: { status: 'AUTHORIZED', documentType: input.documentType },
      ipAddress,
    });
    return {
      uploadId: id,
      uploadUrl: this.storage.presignPut(objectKey, input.mimeType, 300),
      expiresInSeconds: 300,
    };
  }

  private async ownedDriver(userId: string) {
    const [driver] = await this.database.db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
    if (!driver) throw new ValidationError('پروفایل راننده پیدا نشد.');
    return driver;
  }

  async getProfile(userId: string) {
    const driver = await this.ownedDriver(userId);
    const [vehicle] = await this.database.db.select().from(vehicles).where(eq(vehicles.driverId, driver.id)).orderBy(desc(vehicles.createdAt)).limit(1);
    return { driver, vehicle: vehicle ?? null };
  }

  async updateProfile(userId: string, input: UpdateDriverProfileDto, ipAddress?: string) {
    const driver = await this.ownedDriver(userId);
    if (input.secondaryPhoneNumber && input.secondaryPhoneNumber === driver.phoneNumber) {
      throw new ValidationError('شماره همراه دوم نباید با شماره همراه اول یکسان باشد.');
    }
    if (input.emergencyPhoneNumber && input.emergencyPhoneNumber === driver.phoneNumber) {
      throw new ValidationError('شماره تماس اضطراری نباید با شماره همراه اول یکسان باشد.');
    }
    const nullable = new Set(['secondaryPhoneNumber', 'homePhoneNumber', 'referrerName', 'referrerPhoneNumber']);
    const values = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, nullable.has(key) && value === '' ? null : value]));
    if (!Object.keys(values).length) return this.getProfile(userId);
    await this.database.db.transaction(async (txn) => {
      await txn.update(drivers).set({ ...values, updatedAt: new Date() }).where(eq(drivers.id, driver.id));
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DRIVER_PROFILE_UPDATED',
        entityType: 'DRIVER',
        entityId: driver.id,
        newValues: { changedFields: Object.keys(values) },
        ipAddress,
      });
    });
    return this.getProfile(userId);
  }

  async getDocuments(userId: string) {
    const driver = await this.ownedDriver(userId);
    const [vehicle] = await this.database.db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.driverId, driver.id)).orderBy(desc(vehicles.createdAt)).limit(1);
    const rows = await this.database.db.select().from(transportDocuments).where(or(eq(transportDocuments.driverId, driver.id), ...(vehicle ? [eq(transportDocuments.vehicleId, vehicle.id)] : []))).orderBy(desc(transportDocuments.createdAt));
    const latest = rows.filter((row, index, all) => all.findIndex((item) => item.documentType === row.documentType) === index);
    return Promise.all(latest.map(async (row) => ({ id: row.id, documentType: row.documentType, mimeType: row.mimeType, createdAt: row.createdAt, viewUrl: this.storage.presignGet(row.objectKey, 300) })));
  }

  async getServiceRuns(userId: string) {
    const driver = await this.ownedDriver(userId);
    const rows = await this.database.db.select({
      runId: transportServiceRuns.id, title: transportServiceRuns.title, direction: transportServiceRuns.direction,
      sequenceNumber: transportServiceRuns.sequenceNumber, scheduledStartTime: transportServiceRuns.scheduledStartTime,
      scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime, areaDescription: transportServiceRuns.areaDescription,
      activeWeekdays: transportServiceRuns.activeWeekdays, schoolName: schools.name, studentId: students.id,
      firstName: students.firstName, lastName: students.lastName, grade: students.grade,
      pickupOrder: transportServiceRunStudents.pickupOrder,
    }).from(transportServiceRuns)
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .leftJoin(transportServiceRunStudents, and(eq(transportServiceRunStudents.serviceRunId, transportServiceRuns.id), eq(transportServiceRunStudents.isActive, true)))
      .leftJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .where(and(eq(transportServiceRuns.driverId, driver.id), eq(transportServiceRuns.isActive, true)))
      .orderBy(asc(transportServiceRuns.direction), asc(transportServiceRuns.sequenceNumber), asc(transportServiceRunStudents.pickupOrder));
    const grouped = new Map<string, any>();
    for (const row of rows) {
      if (!grouped.has(row.runId)) grouped.set(row.runId, { id: row.runId, title: row.title, direction: row.direction, sequenceNumber: row.sequenceNumber, scheduledStartTime: row.scheduledStartTime, scheduledArrivalTime: row.scheduledArrivalTime, areaDescription: row.areaDescription, activeWeekdays: row.activeWeekdays, schoolName: row.schoolName, students: [] });
      if (row.studentId) grouped.get(row.runId).students.push({ id: row.studentId, firstName: row.firstName, lastName: row.lastName, grade: row.grade, pickupOrder: row.pickupOrder });
    }
    return [...grouped.values()];
  }

  async getStudents(userId: string) {
    const driver = await this.ownedDriver(userId);
    const rows = await this.database.db.select({
      id: students.id, firstName: students.firstName, lastName: students.lastName, fatherName: students.fatherName,
      grade: students.grade, className: students.className, schoolName: schools.name, guardianPhone: users.phoneNumber,
      address: familyAddresses.streetAddress, district: familyAddresses.district, latitude: familyAddresses.latitude,
      longitude: familyAddresses.longitude, guardianFirstName: parents.firstName, guardianLastName: parents.lastName,
      runTitle: transportServiceRuns.title, direction: transportServiceRuns.direction, pickupOrder: transportServiceRunStudents.pickupOrder,
    }).from(transportServiceRunStudents)
      .innerJoin(transportServiceRuns, eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId))
      .innerJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(familyAddresses, and(eq(familyAddresses.userId, students.userId), eq(familyAddresses.isActive, true)))
      .leftJoin(parents, and(eq(parents.userId, students.userId), eq(parents.isPrimaryContact, true)))
      .where(and(eq(transportServiceRuns.driverId, driver.id), eq(transportServiceRuns.isActive, true), eq(transportServiceRunStudents.isActive, true)))
      .orderBy(asc(transportServiceRuns.sequenceNumber), asc(transportServiceRunStudents.pickupOrder));
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const current = grouped.get(row.id) ?? { id: row.id, firstName: row.firstName, lastName: row.lastName, fatherName: row.fatherName, grade: row.grade, className: row.className, schoolName: row.schoolName, guardianPhone: row.guardianPhone, guardianName: [row.guardianFirstName, row.guardianLastName].filter(Boolean).join(' '), address: row.address, district: row.district, latitude: row.latitude, longitude: row.longitude, assignments: [] };
      current.assignments.push({ runTitle: row.runTitle, direction: row.direction, pickupOrder: row.pickupOrder }); grouped.set(row.id, current);
    }
    return [...grouped.values()];
  }

  async getDashboard(userId: string) {
    const [{ driver, vehicle }, runs, assignedStudents, documents] = await Promise.all([this.getProfile(userId), this.getServiceRuns(userId), this.getStudents(userId), this.getDocuments(userId)]);
    const today = new Date().toISOString().slice(0, 10);
    const expiries = [
      { label: 'گواهینامه', date: driver.licenseExpiresAt }, { label: 'بیمه‌نامه', date: vehicle?.insuranceExpiresAt },
      { label: 'معاینه فنی', date: vehicle?.technicalInspectionExpiresAt },
    ].filter((item): item is { label: string; date: string } => Boolean(item.date)).map((item) => ({ ...item, expired: item.date < today }));
    return { driver: { firstName: driver.firstName, lastName: driver.lastName, status: driver.status }, vehicle, counts: { serviceRuns: runs.length, students: assignedStudents.length, images: documents.length }, runs: runs.slice(0, 4), expiries };
  }

  async getAdminDrivers() {
    const rows = await this.database.db.select({
      ...getTableColumns(drivers),
      vehicleId: vehicles.id,
      vehicleType: vehicles.vehicleType,
      vehicleSystem: vehicles.system,
      plateNumber: vehicles.plateNumber,
      capacity: vehicles.capacity,
    }).from(drivers).leftJoin(vehicles, and(eq(vehicles.driverId, drivers.id), eq(vehicles.status, 'ACTIVE')))
      .orderBy(desc(drivers.createdAt));
    const runCounts = await this.database.db.select({ driverId: transportServiceRuns.driverId, count: sql<number>`count(*)::int` })
      .from(transportServiceRuns).where(eq(transportServiceRuns.isActive, true)).groupBy(transportServiceRuns.driverId);
    return rows.map((row) => ({ ...row, serviceRunCount: runCounts.find((item) => item.driverId === row.id)?.count ?? 0 }));
  }

  async getAdminDriver(driverId: string) {
    const [driver] = await this.database.db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
    if (!driver) throw new NotFoundError('Driver', driverId);
    const [vehicle] = await this.database.db.select().from(vehicles).where(eq(vehicles.driverId, driverId)).orderBy(desc(vehicles.createdAt)).limit(1);
    const [runs, documents] = await Promise.all([
      this.getRunsForDriverId(driverId),
      this.database.db.select().from(transportDocuments).where(or(eq(transportDocuments.driverId, driverId), ...(vehicle ? [eq(transportDocuments.vehicleId, vehicle.id)] : []))).orderBy(desc(transportDocuments.createdAt)),
    ]);
    return {
      driver,
      vehicle: vehicle ?? null,
      runs,
      documents: await Promise.all(documents.map(async (document) => ({ ...document, objectKey: undefined, viewUrl: await this.storage.presignGet(document.objectKey, 300) }))),
    };
  }

  private async getRunsForDriverId(driverId: string, schoolIds?: string[]) {
    const conditions = [eq(transportServiceRuns.driverId, driverId), eq(transportServiceRuns.isActive, true)];
    if (schoolIds) conditions.push(inArray(transportServiceRuns.schoolId, schoolIds));
    const rows = await this.database.db.select({
      id: transportServiceRuns.id, title: transportServiceRuns.title, direction: transportServiceRuns.direction,
      academicYear: transportServiceRuns.academicYear, scheduledStartTime: transportServiceRuns.scheduledStartTime,
      scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime, activeWeekdays: transportServiceRuns.activeWeekdays,
      areaDescription: transportServiceRuns.areaDescription, schoolId: schools.id, schoolName: schools.name,
      studentId: students.id, studentFirstName: students.firstName, studentLastName: students.lastName,
      pickupOrder: transportServiceRunStudents.pickupOrder,
    }).from(transportServiceRuns).innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .leftJoin(transportServiceRunStudents, and(eq(transportServiceRunStudents.serviceRunId, transportServiceRuns.id), eq(transportServiceRunStudents.isActive, true)))
      .leftJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .where(and(...conditions)).orderBy(asc(transportServiceRuns.sequenceNumber), asc(transportServiceRunStudents.pickupOrder));
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const run = grouped.get(row.id) ?? { id: row.id, title: row.title, direction: row.direction, academicYear: row.academicYear, scheduledStartTime: row.scheduledStartTime, scheduledArrivalTime: row.scheduledArrivalTime, activeWeekdays: row.activeWeekdays, areaDescription: row.areaDescription, school: { id: row.schoolId, name: row.schoolName }, students: [] };
      if (row.studentId) run.students.push({ id: row.studentId, firstName: row.studentFirstName, lastName: row.studentLastName, pickupOrder: row.pickupOrder });
      grouped.set(row.id, run);
    }
    return [...grouped.values()];
  }

  async getStudentAssignments(studentId: string, ownerUserId?: string) {
    const [student] = await this.database.db.select({ id: students.id, userId: students.userId }).from(students).where(eq(students.id, studentId)).limit(1);
    if (!student) throw new NotFoundError('Student', studentId);
    if (ownerUserId && student.userId !== ownerUserId) throw new AuthorizationError('Access denied.');
    return this.database.db.select({
      membershipId: transportServiceRunStudents.id, runId: transportServiceRuns.id,
      title: transportServiceRuns.title, direction: transportServiceRuns.direction,
      academicYear: transportServiceRuns.academicYear, scheduledStartTime: transportServiceRuns.scheduledStartTime,
      scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime, activeWeekdays: transportServiceRuns.activeWeekdays,
      pickupOrder: transportServiceRunStudents.pickupOrder, schoolName: schools.name,
      driverId: drivers.id, driverFirstName: drivers.firstName, driverLastName: drivers.lastName,
      driverPhoneNumber: drivers.phoneNumber, vehicleType: vehicles.vehicleType, vehicleSystem: vehicles.system,
      plateNumber: vehicles.plateNumber,
    }).from(transportServiceRunStudents)
      .innerJoin(transportServiceRuns, eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId))
      .innerJoin(drivers, eq(drivers.id, transportServiceRuns.driverId))
      .innerJoin(vehicles, eq(vehicles.id, transportServiceRuns.vehicleId))
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .where(and(eq(transportServiceRunStudents.studentId, studentId), eq(transportServiceRunStudents.isActive, true), eq(transportServiceRuns.isActive, true)))
      .orderBy(asc(transportServiceRuns.direction));
  }

  async assignDriverToStudent(studentId: string, input: AssignDriverToStudentDto, adminId: string, ipAddress?: string) {
    if (!input.activeWeekdays.length) throw new ValidationError('حداقل یک روز فعال باید انتخاب شود.');
    const [student, driver, vehicle] = await Promise.all([
      this.database.db.select().from(students).where(eq(students.id, studentId)).limit(1).then((rows) => rows[0]),
      this.database.db.select().from(drivers).where(and(eq(drivers.id, input.driverId), eq(drivers.status, 'ACTIVE'))).limit(1).then((rows) => rows[0]),
      this.database.db.select().from(vehicles).where(and(eq(vehicles.driverId, input.driverId), eq(vehicles.status, 'ACTIVE'))).orderBy(desc(vehicles.createdAt)).limit(1).then((rows) => rows[0]),
    ]);
    if (!student) throw new NotFoundError('Student', studentId);
    if (!driver) throw new NotFoundError('Driver', input.driverId);
    if (!vehicle) throw new ConflictError('DRIVER_HAS_NO_ACTIVE_VEHICLE', 'راننده خودروی فعال ندارد.');
    if (!student.schoolId) throw new ConflictError('STUDENT_HAS_NO_SCHOOL', 'دانش‌آموز مدرسه فعال ندارد.');
    const assignmentEventId = randomUUID();
    await this.database.db.transaction(async (txn) => {
      const oldMemberships = await txn.select({ id: transportServiceRunStudents.id }).from(transportServiceRunStudents)
        .where(and(eq(transportServiceRunStudents.studentId, studentId), eq(transportServiceRunStudents.isActive, true)));
      if (oldMemberships.length) await txn.update(transportServiceRunStudents).set({ isActive: false }).where(inArray(transportServiceRunStudents.id, oldMemberships.map((row) => row.id)));

      for (const direction of ['TO_SCHOOL', 'FROM_SCHOOL'] as const) {
        let [run] = await txn.select().from(transportServiceRuns).where(and(
          eq(transportServiceRuns.schoolId, student.schoolId), eq(transportServiceRuns.driverId, driver.id),
          eq(transportServiceRuns.vehicleId, vehicle.id), eq(transportServiceRuns.academicYear, input.academicYear),
          eq(transportServiceRuns.direction, direction), eq(transportServiceRuns.isActive, true),
        )).orderBy(asc(transportServiceRuns.sequenceNumber)).limit(1);
        if (!run) {
          const [sequence] = await txn.select({ value: max(transportServiceRuns.sequenceNumber) }).from(transportServiceRuns).where(and(eq(transportServiceRuns.vehicleId, vehicle.id), eq(transportServiceRuns.academicYear, input.academicYear), eq(transportServiceRuns.direction, direction)));
          const [created] = await txn.insert(transportServiceRuns).values({
            id: randomUUID(), schoolId: student.schoolId, driverId: driver.id, vehicleId: vehicle.id,
            academicYear: input.academicYear, title: direction === 'TO_SCHOOL' ? 'سرویس رفت به مدرسه' : 'سرویس برگشت از مدرسه',
            direction, sequenceNumber: (sequence?.value ?? 0) + 1,
            scheduledStartTime: direction === 'TO_SCHOOL' ? input.toSchoolStartTime : input.fromSchoolStartTime,
            scheduledArrivalTime: direction === 'TO_SCHOOL' ? input.toSchoolArrivalTime : input.fromSchoolArrivalTime,
            activeWeekdays: [...new Set(input.activeWeekdays)].sort(),
          }).returning();
          run = created;
        }
        const [count] = await txn.select({ value: max(transportServiceRunStudents.pickupOrder) }).from(transportServiceRunStudents).where(eq(transportServiceRunStudents.serviceRunId, run.id));
        const activeCount = await txn.select({ studentId: transportServiceRunStudents.studentId }).from(transportServiceRunStudents).where(and(eq(transportServiceRunStudents.serviceRunId, run.id), eq(transportServiceRunStudents.isActive, true)));
        if (activeCount.length >= vehicle.capacity && !activeCount.some((row) => row.studentId === studentId)) throw new ConflictError('VEHICLE_CAPACITY_REACHED', 'ظرفیت این سرویس تکمیل است.');
        await txn.insert(transportServiceRunStudents).values({ id: randomUUID(), serviceRunId: run.id, studentId, pickupOrder: (count?.value ?? 0) + 1 })
          .onConflictDoUpdate({ target: [transportServiceRunStudents.serviceRunId, transportServiceRunStudents.studentId], set: { isActive: true, pickupOrder: (count?.value ?? 0) + 1 } });
      }
      const driverName = `${driver.firstName} ${driver.lastName}`;
      const studentName = `${student.firstName} ${student.lastName}`;
      await this.notifications.enqueueInTransaction(txn, { eventId: `STUDENT_DRIVER_ASSIGNED:${assignmentEventId}`, userId: student.userId, notificationType: 'STUDENT_DRIVER_ASSIGNED', title: 'راننده سرویس تعیین شد', message: `راننده سرویس ${studentName}، ${driverName} تعیین شد.`, relatedEntityType: 'STUDENT', relatedEntityId: student.id });
      await this.notifications.enqueueInTransaction(txn, { eventId: `DRIVER_STUDENT_ASSIGNED:${assignmentEventId}`, userId: driver.userId, notificationType: 'DRIVER_STUDENT_ASSIGNED', title: 'دانش‌آموز جدید به سرویس افزوده شد', message: `${studentName} به سرویس رفت و برگشت شما افزوده شد.`, relatedEntityType: 'STUDENT', relatedEntityId: student.id });
      await this.audit.recordInTransaction(txn, { actorType: 'ADMIN', actorId: adminId, action: 'DRIVER_ASSIGNED_TO_STUDENT', entityType: 'STUDENT', entityId: student.id, newValues: { driverId: driver.id, academicYear: input.academicYear, activeWeekdays: input.activeWeekdays }, ipAddress });
    });
    return { studentId, driverId: driver.id, assignments: await this.getStudentAssignments(studentId) };
  }

  async enroll(userId: string, verifiedPhone: string, input: DriverEnrollmentDto, ipAddress?: string) {
    if (input.phoneNumber !== verifiedPhone) {
      throw new ValidationError('شماره همراه ثبت‌نام باید با شماره همراه احراز‌شده یکسان باشد.');
    }
    if (!isIranianNationalId(input.nationalId)) {
      throw new ValidationError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
    }
    if (!input.contractFullyRead || !input.contractAccepted) {
      throw new ValidationError('مطالعه کامل و پذیرش قرارداد برای ثبت نهایی الزامی است.');
    }
    if (input.secondaryPhoneNumber && input.secondaryPhoneNumber === input.phoneNumber) {
      throw new ValidationError('شماره همراه دوم نباید با شماره همراه اول یکسان باشد.');
    }
    if (input.emergencyPhoneNumber === input.phoneNumber) {
      throw new ValidationError('شماره تماس اضطراری نباید با شماره همراه اول یکسان باشد.');
    }
    const today = new Date().toISOString().slice(0, 10);
    if ([input.licenseExpiresAt, input.insuranceExpiresAt, input.technicalInspectionExpiresAt].some((date) => date < today)) {
      throw new ValidationError('تاریخ انقضای مدارک نمی‌تواند گذشته باشد.');
    }
    const existing = await this.database.db
      .select({ id: drivers.id })
      .from(drivers)
      .where(or(eq(drivers.nationalId, input.nationalId), eq(drivers.phoneNumber, input.phoneNumber)))
      .limit(1);
    if (existing.length) throw new ValidationError('راننده‌ای با این کد ملی یا شماره همراه قبلاً ثبت شده است.');

    const uploads = await this.database.db
      .select()
      .from(driverDocumentUploads)
      .where(
        and(
          eq(driverDocumentUploads.userId, userId),
          inArray(driverDocumentUploads.id, [input.driverPhotoUploadId, input.vehiclePhotoUploadId]),
          eq(driverDocumentUploads.status, 'AUTHORIZED'),
        ),
      );
    const driverPhoto = uploads.find((upload) => upload.id === input.driverPhotoUploadId && upload.documentType === 'DRIVER_PHOTO');
    const vehiclePhoto = uploads.find((upload) => upload.id === input.vehiclePhotoUploadId && upload.documentType === 'VEHICLE_PHOTO');
    if (!driverPhoto || !vehiclePhoto) throw new ValidationError('بارگذاری هر دو عکس راننده و خودرو الزامی است.');
    for (const upload of [driverPhoto, vehiclePhoto]) {
      const metadata = await this.storage.headObject(upload.objectKey);
      if (metadata.size < 1 || metadata.size > 5 * 1024 * 1024) throw new ValidationError('حجم عکس باید حداکثر ۵ مگابایت باشد.');
      const body = await this.storage.getObject(upload.objectKey, 5 * 1024 * 1024);
      const image = await sharp(body).metadata().catch(() => null);
      if (!image?.width || !image.height || !['jpeg', 'png'].includes(image.format ?? '')) {
        throw new ValidationError('فایل بارگذاری‌شده یک عکس JPG یا PNG معتبر نیست.');
      }
    }

    const acceptedAt = new Date();
    return this.database.db.transaction(async (txn) => {
      const [driver] = await txn.insert(drivers).values({
        userId,
        firstName: input.firstName,
        lastName: input.lastName,
        fatherName: input.fatherName,
        nationalId: input.nationalId,
        phoneNumber: input.phoneNumber,
        secondaryPhoneNumber: input.secondaryPhoneNumber || null,
        homePhoneNumber: input.homePhoneNumber || null,
        emergencyPhoneNumber: input.emergencyPhoneNumber,
        gender: input.gender,
        education: input.education,
        licenseExpiresAt: input.licenseExpiresAt,
        streetAddress: input.streetAddress,
        postalCode: input.postalCode,
        province: input.province,
        city: input.city,
        municipalityDistrict: input.municipalityDistrict,
        latitude: input.latitude,
        longitude: input.longitude,
        referrerName: input.referrerName || null,
        referrerPhoneNumber: input.referrerPhoneNumber || null,
        contractVersion: CONTRACT_VERSION,
        contractAcceptedAt: acceptedAt,
      }).returning({ id: drivers.id });
      const [vehicle] = await txn.insert(vehicles).values({
        driverId: driver.id,
        vehicleType: input.vehicleType,
        system: input.system,
        modelYear: input.modelYear,
        plateNumber: input.plateNumber,
        capacity: CAPACITY[input.vehicleType],
        usageType: input.usageType,
        ownershipType: input.ownershipType,
        insuranceExpiresAt: input.insuranceExpiresAt,
        technicalInspectionExpiresAt: input.technicalInspectionExpiresAt,
      }).returning({ id: vehicles.id });
      await txn.insert(transportDocuments).values([
        { driverId: driver.id, documentType: 'DRIVER_PHOTO', objectKey: driverPhoto.objectKey, mimeType: driverPhoto.mimeType },
        { vehicleId: vehicle.id, documentType: 'VEHICLE_PHOTO', objectKey: vehiclePhoto.objectKey, mimeType: vehiclePhoto.mimeType },
      ]);
      await txn.update(driverDocumentUploads).set({ status: 'LINKED' }).where(inArray(driverDocumentUploads.id, [driverPhoto.id, vehiclePhoto.id]));
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DRIVER_ENROLLMENT_COMPLETED',
        entityType: 'DRIVER',
        entityId: driver.id,
        newValues: { status: 'ACTIVE', contractVersion: CONTRACT_VERSION, vehicleId: vehicle.id },
        ipAddress,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DRIVER_DOCUMENT_LINKED',
        entityType: 'DRIVER_DOCUMENT',
        entityId: driverPhoto.id,
        newValues: { status: 'LINKED', documentType: 'DRIVER_PHOTO' },
        ipAddress,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DRIVER_DOCUMENT_LINKED',
        entityType: 'DRIVER_DOCUMENT',
        entityId: vehiclePhoto.id,
        newValues: { status: 'LINKED', documentType: 'VEHICLE_PHOTO' },
        ipAddress,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'VEHICLE_REGISTERED',
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        newValues: { status: 'ACTIVE', vehicleType: input.vehicleType, ownershipType: input.ownershipType, usageType: input.usageType },
        ipAddress,
      });
      return { driverId: driver.id, vehicleId: vehicle.id, contractVersion: CONTRACT_VERSION, acceptedAt };
    });
  }

  async replacePhoto(userId: string, uploadId: string, ipAddress?: string) {
    const [upload] = await this.database.db.select().from(driverDocumentUploads).where(and(eq(driverDocumentUploads.id, uploadId), eq(driverDocumentUploads.userId, userId), eq(driverDocumentUploads.status, 'AUTHORIZED'))).limit(1);
    if (!upload) throw new ValidationError('بارگذاری معتبر و متعلق به راننده پیدا نشد.');
    const metadata = await this.storage.headObject(upload.objectKey);
    if (metadata.size < 1 || metadata.size > 5 * 1024 * 1024) throw new ValidationError('حجم عکس باید حداکثر ۵ مگابایت باشد.');
    const image = await sharp(await this.storage.getObject(upload.objectKey, 5 * 1024 * 1024)).metadata().catch(() => null);
    if (!image?.width || !image.height || !['jpeg', 'png'].includes(image.format ?? '')) throw new ValidationError('فایل بارگذاری‌شده یک عکس JPG یا PNG معتبر نیست.');
    const [driver] = await this.database.db.select({ id: drivers.id }).from(drivers).where(eq(drivers.userId, userId)).limit(1);
    if (!driver) throw new ValidationError('پروفایل راننده پیدا نشد.');
    const [vehicle] = await this.database.db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.driverId, driver.id)).limit(1);
    if (upload.documentType === 'VEHICLE_PHOTO' && !vehicle) throw new ValidationError('خودروی راننده پیدا نشد.');
    await this.database.db.transaction(async (txn) => {
      await txn.insert(transportDocuments).values(upload.documentType === 'DRIVER_PHOTO'
        ? { driverId: driver.id, documentType: upload.documentType, objectKey: upload.objectKey, mimeType: upload.mimeType }
        : { vehicleId: vehicle!.id, documentType: upload.documentType, objectKey: upload.objectKey, mimeType: upload.mimeType });
      await txn.update(driverDocumentUploads).set({ status: 'LINKED' }).where(eq(driverDocumentUploads.id, upload.id));
      await this.audit.recordInTransaction(txn, {
        actorType: 'DRIVER',
        actorId: userId,
        action: 'DRIVER_DOCUMENT_REPLACED',
        entityType: 'DRIVER_DOCUMENT',
        entityId: upload.id,
        newValues: { status: 'LINKED', documentType: upload.documentType },
        ipAddress,
      });
    });
    return { updated: true, documentType: upload.documentType };
  }
}
