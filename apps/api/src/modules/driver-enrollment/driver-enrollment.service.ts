import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, max, or, sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/errors';
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
  authSessions,
  familyAddresses,
  emergencyContacts,
  parents,
  studentPhotoUploads,
  studentCompanions,
} from '../../database/schemas';
import { S3_CLIENT, type S3Storage } from '../../infrastructure/s3/s3-storage.port';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { AdminUpdateDriverDto, AssignStudentRoutesDto } from './driver-enrollment.dto';
import {
  AddStudentToTransportRouteDto,
  AssignDriverToStudentDto,
  CreateTransportRouteDto,
  DriverDocumentUploadDto,
  DriverEnrollmentDto,
  UpdateDriverProfileDto,
  UpdateTransportRouteDto,
} from './driver-enrollment.dto';
import { schoolHours } from './school-hours';

const CONTRACT_VERSION = 'driver-v2';
const CAPACITY: Record<string, number> = { CAR: 4, VAN: 10, MINIBUS: 21, BUS: 40 };
const VEHICLE_DOCUMENT_TYPES = new Set([
  'VEHICLE_PHOTO',
  'VEHICLE_CARD_FRONT',
  'VEHICLE_CARD_BACK',
  'VEHICLE_TITLE_DOCUMENT',
  'TECHNICAL_INSPECTION_DOCUMENT',
  'INSURANCE_POLICY_DOCUMENT',
]);

@Injectable()
export class DriverEnrollmentService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(S3_CLIENT) private readonly storage: S3Storage,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    private readonly notifications: InAppNotificationService,
  ) {}

  async authorizeUpload(userId: string, input: DriverDocumentUploadDto, ipAddress?: string) {
    const extension =
      input.mimeType === 'application/pdf' ? 'pdf' : input.mimeType === 'image/png' ? 'png' : 'jpg';
    const id = randomUUID();
    const objectKey = `driver-documents/raw/${userId}/${id}.${extension}`;
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
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.userId, userId))
      .limit(1);
    if (!driver) throw new ValidationError('پروفایل راننده پیدا نشد.');
    return driver;
  }

  async getProfile(userId: string) {
    const driver = await this.ownedDriver(userId);
    const [vehicle] = await this.database.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.driverId, driver.id))
      .orderBy(desc(vehicles.createdAt))
      .limit(1);
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
    const nullable = new Set([
      'secondaryPhoneNumber',
      'homePhoneNumber',
      'referrerName',
      'referrerPhoneNumber',
    ]);
    const values = Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, nullable.has(key) && value === '' ? null : value]),
    );
    if (!Object.keys(values).length) return this.getProfile(userId);
    await this.database.db.transaction(async (txn) => {
      await txn
        .update(drivers)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(drivers.id, driver.id));
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
    const [vehicle] = await this.database.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.driverId, driver.id))
      .orderBy(desc(vehicles.createdAt))
      .limit(1);
    const rows = await this.database.db
      .select()
      .from(transportDocuments)
      .where(
        or(
          eq(transportDocuments.driverId, driver.id),
          ...(vehicle ? [eq(transportDocuments.vehicleId, vehicle.id)] : []),
        ),
      )
      .orderBy(desc(transportDocuments.createdAt));
    const latest = rows.filter(
      (row, index, all) =>
        all.findIndex((item) => item.documentType === row.documentType) === index,
    );
    return Promise.all(
      latest.map(async (row) => ({
        id: row.id,
        documentType: row.documentType,
        mimeType: row.mimeType,
        createdAt: row.createdAt,
        reviewStatus: row.reviewStatus,
        rejectionReason: row.rejectionReason,
        viewUrl: this.storage.presignGet(row.objectKey, 300),
      })),
    );
  }

  async getServiceRuns(userId: string) {
    const driver = await this.ownedDriver(userId);
    const rows = await this.database.db
      .select({
        runId: transportServiceRuns.id,
        title: transportServiceRuns.title,
        direction: transportServiceRuns.direction,
        sequenceNumber: transportServiceRuns.sequenceNumber,
        scheduledStartTime: transportServiceRuns.scheduledStartTime,
        scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime,
        areaDescription: transportServiceRuns.areaDescription,
        contractPriceRials: transportServiceRuns.contractPriceRials,
        contractDate: transportServiceRuns.contractDate,
        activeWeekdays: transportServiceRuns.activeWeekdays,
        schoolName: schools.name,
        schoolType: schools.schoolType,
        schoolAddress: schools.address,
        schoolPhoneNumber: schools.phoneNumber,
        schoolLatitude: schools.latitude,
        schoolLongitude: schools.longitude,
        studentId: students.id,
        studentSchoolId: students.schoolId,
        firstName: students.firstName,
        lastName: students.lastName,
        grade: students.grade,
        pickupOrder: transportServiceRunStudents.pickupOrder,
        scheduledStopTime: transportServiceRunStudents.scheduledStopTime,
        companionId: studentCompanions.id,
        companionFirstName: studentCompanions.firstName,
        companionLastName: studentCompanions.lastName,
        companionRelationship: studentCompanions.relationship,
        stopNotes: transportServiceRunStudents.notes,
        studentAddress: familyAddresses.streetAddress,
        studentLatitude: familyAddresses.latitude,
        studentLongitude: familyAddresses.longitude,
        guardianPhone: users.phoneNumber,
        guardianFirstName: parents.firstName,
        guardianLastName: parents.lastName,
      })
      .from(transportServiceRuns)
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .leftJoin(
        transportServiceRunStudents,
        and(
          eq(transportServiceRunStudents.serviceRunId, transportServiceRuns.id),
          eq(transportServiceRunStudents.isActive, true),
        ),
      )
      .leftJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .leftJoin(studentCompanions, eq(studentCompanions.studentId, students.id))
      .leftJoin(users, eq(users.id, students.userId))
      .leftJoin(
        familyAddresses,
        and(eq(familyAddresses.userId, students.userId), eq(familyAddresses.isActive, true)),
      )
      .leftJoin(
        parents,
        and(eq(parents.userId, students.userId), eq(parents.isPrimaryContact, true)),
      )
      .where(
        and(eq(transportServiceRuns.driverId, driver.id), eq(transportServiceRuns.isActive, true)),
      )
      .orderBy(
        asc(transportServiceRuns.direction),
        asc(transportServiceRuns.sequenceNumber),
        asc(transportServiceRunStudents.pickupOrder),
      );
    const studentSchoolIds = [
      ...new Set(rows.map((row) => row.studentSchoolId).filter((id): id is string => Boolean(id))),
    ];
    const studentSchools = studentSchoolIds.length
      ? await this.database.db.select().from(schools).where(inArray(schools.id, studentSchoolIds))
      : [];
    const schoolById = new Map(studentSchools.map((school) => [school.id, school]));
    const grouped = new Map<string, any>();
    for (const row of rows) {
      if (!grouped.has(row.runId))
        grouped.set(row.runId, {
          id: row.runId,
          title: row.title,
          direction: row.direction,
          sequenceNumber: row.sequenceNumber,
          scheduledStartTime: row.scheduledStartTime,
          scheduledArrivalTime: row.scheduledArrivalTime,
          areaDescription: row.areaDescription,
          contractPriceRials: row.contractPriceRials,
          contractDate: row.contractDate,
          activeWeekdays: row.activeWeekdays,
          schoolName: row.schoolName,
          schoolType: row.schoolType,
          schoolAddress: row.schoolAddress,
          schoolPhoneNumber: row.schoolPhoneNumber,
          schoolLatitude: row.schoolLatitude,
          schoolLongitude: row.schoolLongitude,
          students: [],
        });
      if (row.studentId)
        grouped.get(row.runId).students.push({
          id: row.studentId,
          firstName: row.firstName,
          lastName: row.lastName,
          grade: row.grade,
          pickupOrder: row.pickupOrder,
          ...(row.studentSchoolId && schoolById.has(row.studentSchoolId)
            ? schoolHours(schoolById.get(row.studentSchoolId)!, row.direction)
            : { scheduledStopTime: row.scheduledStopTime, scheduledReturnStopTime: null }),
          notes: row.stopNotes,
          address: row.studentAddress,
          latitude: row.studentLatitude,
          longitude: row.studentLongitude,
          guardianPhone: row.guardianPhone,
          guardianName: [row.guardianFirstName, row.guardianLastName].filter(Boolean).join(' '),
          seatCount: row.companionId ? 2 : 1,
          companion: row.companionId
            ? {
                id: row.companionId,
                firstName: row.companionFirstName,
                lastName: row.companionLastName,
                relationship: row.companionRelationship,
              }
            : null,
        });
    }
    return [...grouped.values()];
  }

  async getSchools(userId: string) {
    const driver = await this.ownedDriver(userId);
    const rows = await this.database.db
      .select({
        id: schools.id,
        name: schools.name,
        schoolType: schools.schoolType,
        genderType: schools.genderType,
        province: schools.province,
        city: schools.city,
        district: schools.district,
        address: schools.address,
        phoneNumber: schools.phoneNumber,
        managerName: schools.managerName,
        managerPhone: schools.managerPhone,
        openingTime: schools.openingTime,
        closingTime: schools.closingTime,
        latitude: schools.latitude,
        longitude: schools.longitude,
      })
      .from(transportServiceRuns)
      .innerJoin(
        schools,
        or(
          eq(schools.id, transportServiceRuns.schoolId),
          sql`exists (
        select 1 from transport_service_run_students m join students s on s.id = m.student_id
        where m.service_run_id = ${transportServiceRuns.id} and m.is_active and s.is_active
          and s.school_id = ${schools.id}
      )`,
        ),
      )
      .where(
        and(eq(transportServiceRuns.driverId, driver.id), eq(transportServiceRuns.isActive, true)),
      )
      .orderBy(asc(schools.name));
    return rows.filter(
      (school, index, all) => all.findIndex((item) => item.id === school.id) === index,
    );
  }

  async getStudents(userId: string) {
    const driver = await this.ownedDriver(userId);
    const rows = await this.database.db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        fatherName: students.fatherName,
        grade: students.grade,
        className: students.className,
        schoolName: schools.name,
        guardianPhone: users.phoneNumber,
        address: familyAddresses.streetAddress,
        district: familyAddresses.district,
        latitude: familyAddresses.latitude,
        longitude: familyAddresses.longitude,
        guardianFirstName: parents.firstName,
        guardianLastName: parents.lastName,
        parentType: parents.parentType,
        parentPhoneNumber: parents.phoneNumber,
        runTitle: transportServiceRuns.title,
        direction: transportServiceRuns.direction,
        pickupOrder: transportServiceRunStudents.pickupOrder,
      })
      .from(transportServiceRunStudents)
      .innerJoin(
        transportServiceRuns,
        eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId),
      )
      .innerJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .innerJoin(users, eq(users.id, students.userId))
      .leftJoin(
        familyAddresses,
        and(eq(familyAddresses.userId, students.userId), eq(familyAddresses.isActive, true)),
      )
      .leftJoin(parents, eq(parents.userId, students.userId))
      .where(
        and(
          eq(transportServiceRuns.driverId, driver.id),
          eq(transportServiceRuns.isActive, true),
          eq(transportServiceRunStudents.isActive, true),
        ),
      )
      .orderBy(
        asc(transportServiceRuns.sequenceNumber),
        asc(transportServiceRunStudents.pickupOrder),
      );
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const current = grouped.get(row.id) ?? {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        fatherName: row.fatherName,
        grade: row.grade,
        className: row.className,
        schoolName: row.schoolName,
        guardianPhone: row.guardianPhone,
        address: row.address,
        district: row.district,
        latitude: row.latitude,
        longitude: row.longitude,
        parents: [],
        assignments: [],
      };
      if (
        row.parentPhoneNumber &&
        !current.parents.some(
          (parent: { phoneNumber: string }) => parent.phoneNumber === row.parentPhoneNumber,
        )
      )
        current.parents.push({
          type: row.parentType,
          name: [row.guardianFirstName, row.guardianLastName].filter(Boolean).join(' '),
          phoneNumber: row.parentPhoneNumber,
        });
      if (
        !current.assignments.some(
          (assignment: { runTitle: string; direction: string }) =>
            assignment.runTitle === row.runTitle && assignment.direction === row.direction,
        )
      )
        current.assignments.push({
          runTitle: row.runTitle,
          direction: row.direction,
          pickupOrder: row.pickupOrder,
        });
      grouped.set(row.id, current);
    }
    const result = [...grouped.values()];
    if (!result.length) return result;
    const photos = await this.database.db
      .select({
        studentId: studentPhotoUploads.studentId,
        canonicalKey: studentPhotoUploads.canonicalKey,
      })
      .from(studentPhotoUploads)
      .where(
        and(
          inArray(
            studentPhotoUploads.studentId,
            result.map((student) => student.id),
          ),
          eq(studentPhotoUploads.status, 'APPROVED'),
        ),
      );
    return result.map((student) => {
      const key = photos.find((photo) => photo.studentId === student.id)?.canonicalKey;
      return { ...student, imageUrl: key ? this.storage.presignGet(key, 300) : null };
    });
  }

  async getDashboard(userId: string) {
    const [{ driver, vehicle }, runs, assignedStudents, documents] = await Promise.all([
      this.getProfile(userId),
      this.getServiceRuns(userId),
      this.getStudents(userId),
      this.getDocuments(userId),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const expiries = [
      { label: 'گواهینامه', date: driver.licenseExpiresAt },
      { label: 'بیمه‌نامه', date: vehicle?.insuranceExpiresAt },
      { label: 'معاینه فنی', date: vehicle?.technicalInspectionExpiresAt },
    ]
      .filter((item): item is { label: string; date: string } => Boolean(item.date))
      .map((item) => ({ ...item, expired: item.date < today }));
    return {
      driver: { firstName: driver.firstName, lastName: driver.lastName, status: driver.status },
      vehicle,
      counts: {
        serviceRuns: runs.length,
        students: assignedStudents.length,
        images: documents.length,
      },
      runs: runs.slice(0, 4),
      expiries,
    };
  }

  async getAdminDrivers() {
    const rows = await this.database.db
      .select({
        ...getTableColumns(drivers),
        vehicleId: vehicles.id,
        vehicleType: vehicles.vehicleType,
        vehicleSystem: vehicles.system,
        plateNumber: vehicles.plateNumber,
        capacity: vehicles.capacity,
      })
      .from(drivers)
      .leftJoin(vehicles, eq(vehicles.driverId, drivers.id))
      .orderBy(desc(drivers.createdAt));
    const runCounts = await this.database.db
      .select({ driverId: transportServiceRuns.driverId, count: sql<number>`count(*)::int` })
      .from(transportServiceRuns)
      .where(eq(transportServiceRuns.isActive, true))
      .groupBy(transportServiceRuns.driverId);
    return rows.map((row) => ({
      ...row,
      serviceRunCount: runCounts.find((item) => item.driverId === row.id)?.count ?? 0,
    }));
  }

  async getAdminDriver(driverId: string) {
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);
    if (!driver) throw new NotFoundError('Driver', driverId);
    const [vehicle] = await this.database.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.driverId, driverId))
      .orderBy(desc(vehicles.createdAt))
      .limit(1);
    const [runs, documents] = await Promise.all([
      this.getRunsForDriverId(driverId),
      this.database.db
        .select()
        .from(transportDocuments)
        .where(
          or(
            eq(transportDocuments.driverId, driverId),
            ...(vehicle ? [eq(transportDocuments.vehicleId, vehicle.id)] : []),
          ),
        )
        .orderBy(desc(transportDocuments.createdAt)),
    ]);
    return {
      driver,
      vehicle: vehicle ?? null,
      runs,
      documents: await Promise.all(
        documents
          .filter(
            (document, index, all) =>
              all.findIndex((item) => item.documentType === document.documentType) === index,
          )
          .map(async (document) => ({
            ...document,
            objectKey: undefined,
            viewUrl: await this.storage.presignGet(document.objectKey, 300),
          })),
      ),
    };
  }

  async updateAdminDriver(
    driverId: string,
    input: AdminUpdateDriverDto,
    adminId: string,
    ipAddress?: string,
  ) {
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);
    if (!driver) throw new NotFoundError('Driver', driverId);
    const vehicleKeys = new Set([
      'vehicleType',
      'system',
      'modelYear',
      'plateNumber',
      'capacity',
      'usageType',
      'ownershipType',
      'insuranceExpiresAt',
      'technicalInspectionExpiresAt',
    ]);
    const values = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    const driverValues = Object.fromEntries(
      Object.entries(values).filter(([key]) => !vehicleKeys.has(key)),
    );
    const vehicleValues = Object.fromEntries(
      Object.entries(values).filter(([key]) => vehicleKeys.has(key)),
    );
    const [updated] = await this.database.db.transaction(async (txn) => {
      const rows = await txn
        .update(drivers)
        .set({ ...driverValues, updatedAt: new Date() })
        .where(eq(drivers.id, driverId))
        .returning();
      if (input.phoneNumber && input.phoneNumber !== driver.phoneNumber) {
        const [account] = await txn
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, driver.userId))
          .limit(1);
        await txn
          .update(users)
          .set({
            phoneNumber: input.phoneNumber,
            username:
              account?.username === driver.phoneNumber ? input.phoneNumber : account?.username,
            updatedAt: new Date(),
          })
          .where(eq(users.id, driver.userId));
        await txn
          .update(parents)
          .set({ phoneNumber: input.phoneNumber, updatedAt: new Date() })
          .where(
            and(eq(parents.userId, driver.userId), eq(parents.phoneNumber, driver.phoneNumber)),
          );
      }
      if (input.nationalId && input.nationalId !== driver.nationalId) {
        await txn
          .update(parents)
          .set({ nationalId: input.nationalId, updatedAt: new Date() })
          .where(and(eq(parents.userId, driver.userId), eq(parents.nationalId, driver.nationalId)));
      }
      if (Object.keys(vehicleValues).length) {
        const [vehicle] = await txn
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.driverId, driverId))
          .orderBy(desc(vehicles.createdAt))
          .limit(1);
        if (!vehicle) throw new NotFoundError('Vehicle for driver', driverId);
        await txn
          .update(vehicles)
          .set({ ...vehicleValues, updatedAt: new Date() })
          .where(eq(vehicles.id, vehicle.id));
      }
      return rows;
    });
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'DRIVER_UPDATED',
      entityType: 'DRIVER',
      entityId: driverId,
      newValues: values,
      ipAddress,
    });
    return updated;
  }

  async restoreAdminDriver(driverId: string, adminId: string, ipAddress?: string) {
    const [updated] = await this.database.db
      .update(drivers)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(drivers.id, driverId))
      .returning();
    if (!updated) throw new NotFoundError('Driver', driverId);
    await this.database.db
      .update(vehicles)
      .set({ status: 'ACTIVE', updatedAt: new Date() })
      .where(eq(vehicles.driverId, driverId));
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'DRIVER_RESTORED',
      entityType: 'DRIVER',
      entityId: driverId,
      newValues: { status: 'ACTIVE' },
      ipAddress,
    });
    return updated;
  }

  async permanentlyDeleteAdminDriver(driverId: string, adminId: string, ipAddress?: string) {
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);
    if (!driver) throw new NotFoundError('Driver', driverId);
    const vehicleRows = await this.database.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.driverId, driverId));
    const documents = await this.database.db
      .select({ objectKey: transportDocuments.objectKey })
      .from(transportDocuments)
      .where(
        or(
          eq(transportDocuments.driverId, driverId),
          ...(vehicleRows.length
            ? [
                inArray(
                  transportDocuments.vehicleId,
                  vehicleRows.map((row) => row.id),
                ),
              ]
            : []),
        ),
      );
    const drafts = await this.database.db
      .select({ objectKey: driverDocumentUploads.objectKey })
      .from(driverDocumentUploads)
      .where(eq(driverDocumentUploads.userId, driver.userId));
    const [familyParents, familyStudents, familyLocations, familyContacts] = await Promise.all([
      this.database.db
        .select({ id: parents.id })
        .from(parents)
        .where(eq(parents.userId, driver.userId))
        .limit(1),
      this.database.db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, driver.userId))
        .limit(1),
      this.database.db
        .select({ id: familyAddresses.id })
        .from(familyAddresses)
        .where(eq(familyAddresses.userId, driver.userId))
        .limit(1),
      this.database.db
        .select({ id: emergencyContacts.id })
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, driver.userId))
        .limit(1),
    ]);
    const deleteAccount =
      !familyParents.length &&
      !familyStudents.length &&
      !familyLocations.length &&
      !familyContacts.length;
    const familyPhotoDrafts = deleteAccount
      ? await this.database.db
          .select({
            rawKey: studentPhotoUploads.rawKey,
            canonicalKey: studentPhotoUploads.canonicalKey,
          })
          .from(studentPhotoUploads)
          .where(eq(studentPhotoUploads.accountUserId, driver.userId))
      : [];
    await this.database.db.transaction(async (txn) => {
      const runs = await txn
        .select({ id: transportServiceRuns.id })
        .from(transportServiceRuns)
        .where(eq(transportServiceRuns.driverId, driverId));
      if (runs.length)
        await txn.delete(transportServiceRunStudents).where(
          inArray(
            transportServiceRunStudents.serviceRunId,
            runs.map((row) => row.id),
          ),
        );
      await txn.delete(transportServiceRuns).where(eq(transportServiceRuns.driverId, driverId));
      await txn.delete(transportDocuments).where(
        or(
          eq(transportDocuments.driverId, driverId),
          ...(vehicleRows.length
            ? [
                inArray(
                  transportDocuments.vehicleId,
                  vehicleRows.map((row) => row.id),
                ),
              ]
            : []),
        ),
      );
      await txn.delete(vehicles).where(eq(vehicles.driverId, driverId));
      await txn.delete(drivers).where(eq(drivers.id, driverId));
      await txn
        .delete(driverDocumentUploads)
        .where(eq(driverDocumentUploads.userId, driver.userId));
      await txn
        .delete(authSessions)
        .where(
          deleteAccount
            ? eq(authSessions.subjectId, driver.userId)
            : and(eq(authSessions.subjectId, driver.userId), eq(authSessions.role, 'DRIVER')),
        );
      if (deleteAccount) {
        await txn.execute(sql`select set_config('app.family_erasure', 'on', true)`);
        await txn.delete(users).where(eq(users.id, driver.userId));
      }
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'DRIVER_PERMANENTLY_DELETED',
        entityType: 'DRIVER',
        entityId: driverId,
        previousValues: { userId: driver.userId },
        ipAddress,
      });
    });
    const photoKeys = familyPhotoDrafts.flatMap((photo) =>
      [photo.rawKey, photo.canonicalKey].filter((key): key is string => Boolean(key)),
    );
    await Promise.all(
      [
        ...documents.map((item) => item.objectKey),
        ...drafts.map((item) => item.objectKey),
        ...photoKeys,
      ].map((key) => this.storage.deleteObject(key).catch(() => undefined)),
    );
    return { deleted: true, accountDeleted: deleteAccount };
  }

  async deactivateAdminDriver(driverId: string, adminId: string, ipAddress?: string) {
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, driverId))
      .limit(1);
    if (!driver) throw new NotFoundError('Driver', driverId);
    await this.database.db.transaction(async (txn) => {
      await txn
        .update(drivers)
        .set({ status: 'INACTIVE', updatedAt: new Date() })
        .where(eq(drivers.id, driverId));
      await txn
        .update(vehicles)
        .set({ status: 'INACTIVE', updatedAt: new Date() })
        .where(eq(vehicles.driverId, driverId));
      await txn
        .update(transportServiceRuns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(transportServiceRuns.driverId, driverId));
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'DRIVER_DEACTIVATED',
        entityType: 'DRIVER',
        entityId: driverId,
        newValues: { status: 'INACTIVE' },
        ipAddress,
      });
    });
    return { deactivated: true };
  }

  async rejectDriverDocument(
    driverId: string,
    documentId: string,
    reason: string | undefined,
    adminId: string,
    ipAddress?: string,
  ) {
    const [vehicle] = await this.database.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.driverId, driverId))
      .orderBy(desc(vehicles.createdAt))
      .limit(1);
    const [document] = await this.database.db
      .select()
      .from(transportDocuments)
      .where(
        and(
          eq(transportDocuments.id, documentId),
          or(
            eq(transportDocuments.driverId, driverId),
            ...(vehicle ? [eq(transportDocuments.vehicleId, vehicle.id)] : []),
          ),
        ),
      )
      .limit(1);
    if (!document) throw new NotFoundError('Driver document', documentId);
    await this.database.db
      .update(transportDocuments)
      .set({
        reviewStatus: 'REJECTED',
        rejectionReason: reason?.trim() || null,
        reviewedAt: new Date(),
      })
      .where(eq(transportDocuments.id, documentId));
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'DRIVER_DOCUMENT_REJECTED',
      entityType: 'DRIVER_DOCUMENT',
      entityId: documentId,
      newValues: { driverId, reason: reason?.trim() || null },
      ipAddress,
    });
    return { rejected: true };
  }

  async getAdminRoutes() {
    const rows = await this.database.db
      .select({
        id: transportServiceRuns.id,
        driverId: drivers.id,
        title: transportServiceRuns.title,
        direction: transportServiceRuns.direction,
        academicYear: transportServiceRuns.academicYear,
        scheduledStartTime: transportServiceRuns.scheduledStartTime,
        scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime,
        activeWeekdays: transportServiceRuns.activeWeekdays,
        areaDescription: transportServiceRuns.areaDescription,
        contractPriceRials: transportServiceRuns.contractPriceRials,
        contractDate: transportServiceRuns.contractDate,
        schoolId: schools.id,
        schoolName: schools.name,
        firstName: drivers.firstName,
        lastName: drivers.lastName,
        phoneNumber: drivers.phoneNumber,
        nationalId: drivers.nationalId,
        driverStatus: drivers.status,
        vehicleType: vehicles.vehicleType,
        vehicleSystem: vehicles.system,
        plateNumber: vehicles.plateNumber,
        capacity: vehicles.capacity,
        studentId: students.id,
        studentSchoolId: students.schoolId,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        pickupOrder: transportServiceRunStudents.pickupOrder,
        scheduledStopTime: transportServiceRunStudents.scheduledStopTime,
        companionId: studentCompanions.id,
        companionFirstName: studentCompanions.firstName,
        companionLastName: studentCompanions.lastName,
        companionRelationship: studentCompanions.relationship,
      })
      .from(transportServiceRuns)
      .innerJoin(drivers, eq(drivers.id, transportServiceRuns.driverId))
      .innerJoin(vehicles, eq(vehicles.id, transportServiceRuns.vehicleId))
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .leftJoin(
        transportServiceRunStudents,
        and(
          eq(transportServiceRunStudents.serviceRunId, transportServiceRuns.id),
          eq(transportServiceRunStudents.isActive, true),
        ),
      )
      .leftJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .leftJoin(studentCompanions, eq(studentCompanions.studentId, students.id))
      .where(eq(transportServiceRuns.isActive, true))
      .orderBy(
        asc(drivers.lastName),
        asc(transportServiceRuns.sequenceNumber),
        asc(transportServiceRunStudents.pickupOrder),
      );
    const studentSchoolIds = [
      ...new Set(rows.map((row) => row.studentSchoolId).filter((id): id is string => Boolean(id))),
    ];
    const studentSchools = studentSchoolIds.length
      ? await this.database.db.select().from(schools).where(inArray(schools.id, studentSchoolIds))
      : [];
    const schoolById = new Map(studentSchools.map((school) => [school.id, school]));
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const route = grouped.get(row.id) ?? {
        id: row.id,
        driverId: row.driverId,
        title: row.title,
        direction: row.direction,
        academicYear: row.academicYear,
        scheduledStartTime: row.scheduledStartTime,
        scheduledArrivalTime: row.scheduledArrivalTime,
        activeWeekdays: row.activeWeekdays,
        areaDescription: row.areaDescription,
        contractPriceRials: row.contractPriceRials,
        contractDate: row.contractDate,
        school: { id: row.schoolId, name: row.schoolName },
        driver: {
          id: row.driverId,
          firstName: row.firstName,
          lastName: row.lastName,
          phoneNumber: row.phoneNumber,
          nationalId: row.nationalId,
          status: row.driverStatus,
          vehicleType: row.vehicleType,
          vehicleSystem: row.vehicleSystem,
          plateNumber: row.plateNumber,
          capacity: row.capacity,
          serviceRunCount: 0,
        },
        students: [],
      };
      if (row.studentId)
        route.students.push({
          id: row.studentId,
          firstName: row.studentFirstName,
          lastName: row.studentLastName,
          pickupOrder: row.pickupOrder,
          ...(row.studentSchoolId && schoolById.has(row.studentSchoolId)
            ? schoolHours(schoolById.get(row.studentSchoolId)!, row.direction)
            : { scheduledStopTime: row.scheduledStopTime, scheduledReturnStopTime: null }),
          seatCount: row.companionId ? 2 : 1,
          companion: row.companionId
            ? {
                id: row.companionId,
                firstName: row.companionFirstName,
                lastName: row.companionLastName,
                relationship: row.companionRelationship,
              }
            : null,
        });
      grouped.set(row.id, route);
    }
    return [...grouped.values()];
  }

  async createAdminRoute(input: CreateTransportRouteDto, adminId: string, ipAddress?: string) {
    if (!input.activeWeekdays.length)
      throw new ValidationError('حداقل یک روز فعال باید انتخاب شود.');
    const [driver, school, vehicle] = await Promise.all([
      this.database.db
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, input.driverId), eq(drivers.status, 'ACTIVE')))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(schools)
        .where(and(eq(schools.id, input.schoolId), eq(schools.isActive, true)))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.driverId, input.driverId), eq(vehicles.status, 'ACTIVE')))
        .orderBy(desc(vehicles.createdAt))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!driver) throw new NotFoundError('Driver', input.driverId);
    if (!school) throw new NotFoundError('School', input.schoolId);
    if (!vehicle)
      throw new ConflictError('DRIVER_HAS_NO_ACTIVE_VEHICLE', 'راننده خودروی فعال ندارد.');
    const scheduledStartTime = school.openingTime;
    const scheduledArrivalTime = [...(school.closingTimes ?? []), school.closingTime]
      .filter(Boolean)
      .sort()
      .at(-1)!;
    if (scheduledStartTime >= scheduledArrivalTime)
      throw new ValidationError('ساعت پایان مدرسه باید بعد از ساعت شروع باشد.');
    return this.database.db.transaction(async (txn) => {
      await txn.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${vehicle.id}:${input.academicYear}:${input.direction}`}))`,
      );
      const [sequence] = await txn
        .select({ value: max(transportServiceRuns.sequenceNumber) })
        .from(transportServiceRuns)
        .where(
          and(
            eq(transportServiceRuns.vehicleId, vehicle.id),
            eq(transportServiceRuns.academicYear, input.academicYear),
            eq(transportServiceRuns.direction, input.direction),
          ),
        );
      const [created] = await txn
        .insert(transportServiceRuns)
        .values({
          id: randomUUID(),
          schoolId: school.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          academicYear: input.academicYear,
          title: input.title,
          direction: input.direction,
          sequenceNumber: (sequence?.value ?? 0) + 1,
          scheduledStartTime,
          scheduledArrivalTime,
          areaDescription: input.areaDescription || null,
          contractPriceRials: input.contractPriceRials ?? null,
          contractDate: input.contractDate ?? null,
          activeWeekdays: [...new Set(input.activeWeekdays)].sort(),
        })
        .returning();
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'TRANSPORT_ROUTE_CREATED',
        entityType: 'TRANSPORT_SERVICE_RUN',
        entityId: created.id,
        newValues: { driverId: driver.id, schoolId: school.id, title: created.title },
        ipAddress,
      });
      return created;
    });
  }

  async updateAdminRoute(
    routeId: string,
    input: UpdateTransportRouteDto,
    adminId: string,
    ipAddress?: string,
  ) {
    const [route] = await this.database.db
      .select()
      .from(transportServiceRuns)
      .where(and(eq(transportServiceRuns.id, routeId), eq(transportServiceRuns.isActive, true)))
      .limit(1);
    if (!route) throw new NotFoundError('Transport route', routeId);
    const schoolId = input.schoolId ?? route.schoolId;
    const driverId = input.driverId ?? route.driverId;
    const [school, vehicle] = await Promise.all([
      this.database.db
        .select()
        .from(schools)
        .where(and(eq(schools.id, schoolId), eq(schools.isActive, true)))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.driverId, driverId), eq(vehicles.status, 'ACTIVE')))
        .orderBy(desc(vehicles.createdAt))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!school) throw new NotFoundError('School', schoolId);
    if (!vehicle)
      throw new ConflictError('DRIVER_HAS_NO_ACTIVE_VEHICLE', 'راننده خودروی فعال ندارد.');
    const values = {
      ...input,
      schoolId,
      driverId,
      vehicleId: vehicle.id,
      scheduledStartTime: school.openingTime,
      scheduledArrivalTime: [...(school.closingTimes ?? []), school.closingTime]
        .filter(Boolean)
        .sort()
        .at(-1)!,
      updatedAt: new Date(),
    };
    const [updated] = await this.database.db
      .update(transportServiceRuns)
      .set(values)
      .where(eq(transportServiceRuns.id, routeId))
      .returning();
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'TRANSPORT_ROUTE_UPDATED',
      entityType: 'TRANSPORT_SERVICE_RUN',
      entityId: routeId,
      newValues: values,
      ipAddress,
    });
    return updated;
  }

  async assignStudentRoutes(input: AssignStudentRoutesDto, adminId: string, ipAddress?: string) {
    return this.database.db.transaction(async (txn) => {
      const [student] = await txn
        .select()
        .from(students)
        .where(and(eq(students.id, input.studentId), eq(students.isActive, true)))
        .for('update');
      if (!student) throw new NotFoundError('Student', input.studentId);
      const selected = await txn
        .select()
        .from(transportServiceRuns)
        .where(inArray(transportServiceRuns.id, [input.toSchoolRouteId, input.fromSchoolRouteId]))
        .orderBy(asc(transportServiceRuns.id))
        .for('update');
      const outbound = selected.find((r) => r.id === input.toSchoolRouteId);
      const inbound = selected.find((r) => r.id === input.fromSchoolRouteId);
      if (
        !outbound ||
        !inbound ||
        !outbound.isActive ||
        !inbound.isActive ||
        outbound.direction !== 'TO_SCHOOL' ||
        inbound.direction !== 'FROM_SCHOOL'
      ) {
        throw new ValidationError('یک مسیر رفت و یک مسیر برگشت فعال انتخاب کنید.');
      }
      if (
        outbound.driverId !== inbound.driverId ||
        outbound.academicYear !== inbound.academicYear
      ) {
        throw new ValidationError('هر دو مسیر باید متعلق به یک راننده و یک سال تحصیلی باشند.');
      }
      const [driver] = await txn
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, outbound.driverId), eq(drivers.status, 'ACTIVE')));
      if (!driver) throw new ValidationError('راننده فعال نیست.');
      const vehicleRows = await txn
        .select()
        .from(vehicles)
        .where(
          inArray(
            vehicles.id,
            selected.map((r) => r.vehicleId),
          ),
        )
        .orderBy(asc(vehicles.id))
        .for('update');
      for (const route of selected) {
        const stop =
          route.direction === 'TO_SCHOOL' ? input.toSchoolStopTime : input.fromSchoolStopTime;
        if (
          stop < route.scheduledStartTime.slice(0, 5) ||
          stop > route.scheduledArrivalTime.slice(0, 5)
        )
          throw new ValidationError('زمان توقف باید در بازه مسیر باشد.');
        const vehicle = vehicleRows.find((v) => v.id === route.vehicleId);
        if (!vehicle || vehicle.status !== 'ACTIVE')
          throw new ConflictError('ROUTE_HAS_NO_VEHICLE', 'خودروی فعال برای مسیر پیدا نشد.');
        // Admin planning may exceed nominal capacity; the UI displays a warning.
      }
      const previous = await txn
        .select({ id: transportServiceRunStudents.id, driverId: transportServiceRuns.driverId })
        .from(transportServiceRunStudents)
        .innerJoin(
          transportServiceRuns,
          eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId),
        )
        .where(
          and(
            eq(transportServiceRunStudents.studentId, student.id),
            eq(transportServiceRunStudents.isActive, true),
            eq(transportServiceRuns.academicYear, outbound.academicYear),
          ),
        );
      if (previous.length)
        await txn
          .update(transportServiceRunStudents)
          .set({ isActive: false })
          .where(
            inArray(
              transportServiceRunStudents.id,
              previous.map((m) => m.id),
            ),
          );
      for (const route of selected) {
        const [existing] = await txn
          .select()
          .from(transportServiceRunStudents)
          .where(
            and(
              eq(transportServiceRunStudents.serviceRunId, route.id),
              eq(transportServiceRunStudents.studentId, student.id),
            ),
          );
        const [last] = await txn
          .select({ value: max(transportServiceRunStudents.pickupOrder) })
          .from(transportServiceRunStudents)
          .where(eq(transportServiceRunStudents.serviceRunId, route.id));
        const values = {
          isActive: true,
          scheduledStopTime:
            route.direction === 'TO_SCHOOL' ? input.toSchoolStopTime : input.fromSchoolStopTime,
        };
        if (existing)
          await txn
            .update(transportServiceRunStudents)
            .set(values)
            .where(eq(transportServiceRunStudents.id, existing.id));
        else
          await txn.insert(transportServiceRunStudents).values({
            ...values,
            serviceRunId: route.id,
            studentId: student.id,
            pickupOrder: (last?.value ?? 0) + 1,
          });
      }
      const eventId = randomUUID();
      const message = `سرویس رفت و برگشت ${student.firstName} ${student.lastName} با رانندگی ${driver.firstName} ${driver.lastName} ثبت شد.`;
      const recipients = new Set([student.userId, driver.userId]);
      if (previous.length) {
        const oldDrivers = await txn
          .select({ userId: drivers.userId })
          .from(drivers)
          .where(
            inArray(
              drivers.id,
              previous.map((m) => m.driverId),
            ),
          );
        oldDrivers.forEach((d) => recipients.add(d.userId));
      }
      for (const userId of recipients)
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `ROUTE_PAIR:${eventId}:${userId}`,
          userId,
          notificationType: 'STUDENT_DRIVER_ASSIGNED',
          title: 'برنامه سرویس به‌روزرسانی شد',
          message,
          relatedEntityType: 'STUDENT',
          relatedEntityId: student.id,
        });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'STUDENT_ROUTE_PAIR_ASSIGNED',
        entityType: 'STUDENT',
        entityId: student.id,
        newValues: {
          driverId: driver.id,
          toSchoolRouteId: outbound.id,
          fromSchoolRouteId: inbound.id,
        },
        ipAddress,
      });
      return { assigned: true };
    });
  }

  async addStudentToRoute(
    routeId: string,
    input: AddStudentToTransportRouteDto,
    adminId: string,
    ipAddress?: string,
  ) {
    const [route, student] = await Promise.all([
      this.database.db
        .select()
        .from(transportServiceRuns)
        .where(and(eq(transportServiceRuns.id, routeId), eq(transportServiceRuns.isActive, true)))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(students)
        .where(and(eq(students.id, input.studentId), eq(students.isActive, true)))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!route) throw new NotFoundError('Transport route', routeId);
    if (!student) throw new NotFoundError('Student', input.studentId);
    if (!student.schoolId)
      throw new ConflictError('STUDENT_HAS_NO_SCHOOL', 'مدرسه دانش‌آموز ثبت نشده است.');
    const [studentSchool, vehicle, driver] = await Promise.all([
      this.database.db
        .select()
        .from(schools)
        .where(and(eq(schools.id, student.schoolId), eq(schools.isActive, true)))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(vehicles)
        .where(eq(vehicles.id, route.vehicleId))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(drivers)
        .where(eq(drivers.id, route.driverId))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!studentSchool)
      throw new ConflictError('STUDENT_HAS_NO_SCHOOL', 'مدرسه فعال دانش‌آموز پیدا نشد.');
    const { scheduledStopTime } = schoolHours(studentSchool, route.direction);
    if (!vehicle) throw new ConflictError('ROUTE_HAS_NO_VEHICLE', 'خودروی مسیر پیدا نشد.');
    // Admin route planning may intentionally exceed nominal vehicle capacity.
    await this.database.db.transaction(async (txn) => {
      const overlappingDirections =
        route.direction === 'ROUND_TRIP'
          ? ['TO_SCHOOL', 'FROM_SCHOOL', 'ROUND_TRIP']
          : [route.direction, 'ROUND_TRIP'];
      const previous = await txn
        .select({ id: transportServiceRunStudents.id, driverUserId: drivers.userId })
        .from(transportServiceRunStudents)
        .innerJoin(
          transportServiceRuns,
          eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId),
        )
        .innerJoin(drivers, eq(drivers.id, transportServiceRuns.driverId))
        .where(
          and(
            eq(transportServiceRunStudents.studentId, student.id),
            eq(transportServiceRunStudents.isActive, true),
            eq(transportServiceRuns.isActive, true),
            eq(transportServiceRuns.academicYear, route.academicYear),
            inArray(
              transportServiceRuns.direction,
              overlappingDirections as ('TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP')[],
            ),
            sql`${transportServiceRuns.id} <> ${route.id}`,
          ),
        );
      if (previous.length)
        await txn
          .update(transportServiceRunStudents)
          .set({ isActive: false })
          .where(
            inArray(
              transportServiceRunStudents.id,
              previous.map((item) => item.id),
            ),
          );
      const positions = await txn
        .select({
          id: transportServiceRunStudents.id,
          studentId: transportServiceRunStudents.studentId,
          pickupOrder: transportServiceRunStudents.pickupOrder,
        })
        .from(transportServiceRunStudents)
        .where(eq(transportServiceRunStudents.serviceRunId, route.id));
      const existing = positions.find((item) => item.studentId === student.id);
      const pickupOrder = positions.some(
        (item) => item.id !== existing?.id && item.pickupOrder === input.pickupOrder,
      )
        ? Math.max(...positions.map((item) => item.pickupOrder), 0) + 1
        : input.pickupOrder;
      if (existing)
        await txn
          .update(transportServiceRunStudents)
          .set({ isActive: true, pickupOrder, scheduledStopTime, notes: input.notes || null })
          .where(eq(transportServiceRunStudents.id, existing.id));
      else
        await txn.insert(transportServiceRunStudents).values({
          id: randomUUID(),
          serviceRunId: route.id,
          studentId: student.id,
          pickupOrder,
          scheduledStopTime,
          notes: input.notes || null,
        });
      const eventId = randomUUID();
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `STUDENT_ROUTE_ASSIGNED:${eventId}`,
        userId: student.userId,
        notificationType: 'STUDENT_DRIVER_ASSIGNED',
        title: 'مسیر سرویس تعیین شد',
        message: `${route.title} با رانندگی ${driver ? `${driver.firstName} ${driver.lastName}` : 'راننده سرویس'} برای شما ثبت شد.`,
        relatedEntityType: 'STUDENT',
        relatedEntityId: student.id,
      });
      if (driver?.userId)
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `DRIVER_ROUTE_STUDENT_ASSIGNED:${eventId}`,
          userId: driver.userId,
          notificationType: 'DRIVER_STUDENT_ASSIGNED',
          title: 'دانش‌آموز به مسیر افزوده شد',
          message: `${student.firstName} ${student.lastName} به مسیر ${route.title} افزوده شد.`,
          relatedEntityType: 'STUDENT',
          relatedEntityId: student.id,
        });
      for (const userId of new Set(previous.map((item) => item.driverUserId)))
        if (userId && userId !== driver?.userId)
          await this.notifications.enqueueInTransaction(txn, {
            eventId: `DRIVER_ROUTE_STUDENT_REMOVED:${eventId}:${userId}`,
            userId,
            notificationType: 'DRIVER_STUDENT_ASSIGNED',
            title: 'تغییر مسیر دانش‌آموز',
            message: `${student.firstName} ${student.lastName} از مسیر پیشین شما خارج شد.`,
            relatedEntityType: 'STUDENT',
            relatedEntityId: student.id,
          });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'STUDENT_ADDED_TO_TRANSPORT_ROUTE',
        entityType: 'TRANSPORT_SERVICE_RUN',
        entityId: route.id,
        newValues: {
          studentId: student.id,
          pickupOrder,
          replacedMembershipIds: previous.map((item) => item.id),
          ...schoolHours(studentSchool, route.direction),
        },
        ipAddress,
      });
    });
    return this.getRunsForDriverId(route.driverId);
  }

  async removeStudentFromRoute(
    routeId: string,
    studentId: string,
    adminId: string,
    ipAddress?: string,
  ) {
    const [route, student, membership] = await Promise.all([
      this.database.db
        .select()
        .from(transportServiceRuns)
        .where(eq(transportServiceRuns.id, routeId))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(transportServiceRunStudents)
        .where(
          and(
            eq(transportServiceRunStudents.serviceRunId, routeId),
            eq(transportServiceRunStudents.studentId, studentId),
            eq(transportServiceRunStudents.isActive, true),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!route) throw new NotFoundError('Transport route', routeId);
    if (!student || !membership) throw new NotFoundError('Route membership', studentId);
    const [driver] = await this.database.db
      .select()
      .from(drivers)
      .where(eq(drivers.id, route.driverId))
      .limit(1);
    await this.database.db.transaction(async (txn) => {
      await txn
        .update(transportServiceRunStudents)
        .set({ isActive: false })
        .where(eq(transportServiceRunStudents.id, membership.id));
      const eventId = randomUUID();
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `STUDENT_ROUTE_REMOVED:${eventId}`,
        userId: student.userId,
        notificationType: 'STUDENT_DRIVER_ASSIGNED',
        title: 'مسیر سرویس تغییر کرد',
        message: `ارتباط شما با مسیر ${route.title} پایان یافت.`,
        relatedEntityType: 'STUDENT',
        relatedEntityId: student.id,
      });
      if (driver?.userId)
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `DRIVER_ROUTE_STUDENT_REMOVED:${eventId}`,
          userId: driver.userId,
          notificationType: 'DRIVER_STUDENT_ASSIGNED',
          title: 'فهرست مسیر تغییر کرد',
          message: `${student.firstName} ${student.lastName} از مسیر ${route.title} حذف شد.`,
          relatedEntityType: 'STUDENT',
          relatedEntityId: student.id,
        });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'STUDENT_REMOVED_FROM_TRANSPORT_ROUTE',
        entityType: 'TRANSPORT_SERVICE_RUN',
        entityId: route.id,
        newValues: { studentId },
        ipAddress,
      });
    });
    return { removed: true };
  }

  async archiveRoute(routeId: string, adminId: string, ipAddress?: string) {
    const [route] = await this.database.db
      .select()
      .from(transportServiceRuns)
      .where(and(eq(transportServiceRuns.id, routeId), eq(transportServiceRuns.isActive, true)))
      .limit(1);
    if (!route) throw new NotFoundError('Transport route', routeId);
    const [driver, members] = await Promise.all([
      this.database.db
        .select({ userId: drivers.userId })
        .from(drivers)
        .where(eq(drivers.id, route.driverId))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select({ studentId: students.id, userId: students.userId })
        .from(transportServiceRunStudents)
        .innerJoin(students, eq(students.id, transportServiceRunStudents.studentId))
        .where(
          and(
            eq(transportServiceRunStudents.serviceRunId, routeId),
            eq(transportServiceRunStudents.isActive, true),
          ),
        ),
    ]);
    await this.database.db.transaction(async (txn) => {
      await txn
        .update(transportServiceRuns)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(transportServiceRuns.id, routeId));
      await txn
        .update(transportServiceRunStudents)
        .set({ isActive: false })
        .where(eq(transportServiceRunStudents.serviceRunId, routeId));
      const eventId = randomUUID();
      for (const member of members)
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `STUDENT_ROUTE_ARCHIVED:${eventId}:${member.studentId}`,
          userId: member.userId,
          notificationType: 'STUDENT_DRIVER_ASSIGNED',
          title: 'مسیر سرویس غیرفعال شد',
          message: `مسیر ${route.title} غیرفعال شد. برنامه جایگزین از طریق پنل اطلاع‌رسانی می‌شود.`,
          relatedEntityType: 'STUDENT',
          relatedEntityId: member.studentId,
        });
      if (driver?.userId)
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `DRIVER_ROUTE_ARCHIVED:${eventId}`,
          userId: driver.userId,
          notificationType: 'DRIVER_STUDENT_ASSIGNED',
          title: 'مسیر غیرفعال شد',
          message: `مسیر ${route.title} توسط مدیریت غیرفعال شد.`,
          relatedEntityType: 'TRANSPORT_SERVICE_RUN',
          relatedEntityId: route.id,
        });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'TRANSPORT_ROUTE_ARCHIVED',
        entityType: 'TRANSPORT_SERVICE_RUN',
        entityId: route.id,
        newValues: { isActive: false, affectedStudents: members.length },
        ipAddress,
      });
    });
    return { archived: true };
  }

  private async getRunsForDriverId(driverId: string, schoolIds?: string[]) {
    const conditions = [
      eq(transportServiceRuns.driverId, driverId),
      eq(transportServiceRuns.isActive, true),
    ];
    if (schoolIds) conditions.push(inArray(transportServiceRuns.schoolId, schoolIds));
    const rows = await this.database.db
      .select({
        id: transportServiceRuns.id,
        title: transportServiceRuns.title,
        direction: transportServiceRuns.direction,
        academicYear: transportServiceRuns.academicYear,
        scheduledStartTime: transportServiceRuns.scheduledStartTime,
        scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime,
        activeWeekdays: transportServiceRuns.activeWeekdays,
        areaDescription: transportServiceRuns.areaDescription,
        contractPriceRials: transportServiceRuns.contractPriceRials,
        contractDate: transportServiceRuns.contractDate,
        schoolId: schools.id,
        schoolName: schools.name,
        schoolType: schools.schoolType,
        studentId: students.id,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        pickupOrder: transportServiceRunStudents.pickupOrder,
        scheduledStopTime: transportServiceRunStudents.scheduledStopTime,
      })
      .from(transportServiceRuns)
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .leftJoin(
        transportServiceRunStudents,
        and(
          eq(transportServiceRunStudents.serviceRunId, transportServiceRuns.id),
          eq(transportServiceRunStudents.isActive, true),
        ),
      )
      .leftJoin(students, eq(students.id, transportServiceRunStudents.studentId))
      .where(and(...conditions))
      .orderBy(
        asc(transportServiceRuns.sequenceNumber),
        asc(transportServiceRunStudents.pickupOrder),
      );
    const grouped = new Map<string, any>();
    for (const row of rows) {
      const run = grouped.get(row.id) ?? {
        id: row.id,
        title: row.title,
        direction: row.direction,
        academicYear: row.academicYear,
        scheduledStartTime: row.scheduledStartTime,
        scheduledArrivalTime: row.scheduledArrivalTime,
        activeWeekdays: row.activeWeekdays,
        areaDescription: row.areaDescription,
        contractPriceRials: row.contractPriceRials,
        contractDate: row.contractDate,
        school: { id: row.schoolId, name: row.schoolName, schoolType: row.schoolType },
        students: [],
      };
      if (row.studentId)
        run.students.push({
          id: row.studentId,
          firstName: row.studentFirstName,
          lastName: row.studentLastName,
          pickupOrder: row.pickupOrder,
          scheduledStopTime: row.scheduledStopTime,
        });
      run.driverId = driverId;
      grouped.set(row.id, run);
    }
    return [...grouped.values()].map((route) => ({
      ...route,
      students: route.students.sort(
        (a: { pickupOrder: number }, b: { pickupOrder: number }) => a.pickupOrder - b.pickupOrder,
      ),
    }));
  }

  async getStudentAssignments(studentId: string, ownerUserId?: string) {
    const [student] = await this.database.db
      .select({ id: students.id, userId: students.userId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);
    if (!student) throw new NotFoundError('Student', studentId);
    if (ownerUserId && student.userId !== ownerUserId)
      throw new AuthorizationError('Access denied.');
    return this.database.db
      .select({
        membershipId: transportServiceRunStudents.id,
        runId: transportServiceRuns.id,
        title: transportServiceRuns.title,
        direction: transportServiceRuns.direction,
        academicYear: transportServiceRuns.academicYear,
        scheduledStartTime: transportServiceRuns.scheduledStartTime,
        scheduledArrivalTime: transportServiceRuns.scheduledArrivalTime,
        activeWeekdays: transportServiceRuns.activeWeekdays,
        pickupOrder: transportServiceRunStudents.pickupOrder,
        scheduledStopTime: transportServiceRunStudents.scheduledStopTime,
        schoolName: schools.name,
        driverId: drivers.id,
        driverFirstName: drivers.firstName,
        driverLastName: drivers.lastName,
        driverPhoneNumber: drivers.phoneNumber,
        vehicleType: vehicles.vehicleType,
        vehicleSystem: vehicles.system,
        plateNumber: vehicles.plateNumber,
      })
      .from(transportServiceRunStudents)
      .innerJoin(
        transportServiceRuns,
        eq(transportServiceRuns.id, transportServiceRunStudents.serviceRunId),
      )
      .innerJoin(drivers, eq(drivers.id, transportServiceRuns.driverId))
      .innerJoin(vehicles, eq(vehicles.id, transportServiceRuns.vehicleId))
      .innerJoin(schools, eq(schools.id, transportServiceRuns.schoolId))
      .where(
        and(
          eq(transportServiceRunStudents.studentId, studentId),
          eq(transportServiceRunStudents.isActive, true),
          eq(transportServiceRuns.isActive, true),
        ),
      )
      .orderBy(asc(transportServiceRuns.direction));
  }

  async assignDriverToStudent(
    studentId: string,
    input: AssignDriverToStudentDto,
    adminId: string,
    ipAddress?: string,
  ) {
    if (!input.activeWeekdays.length)
      throw new ValidationError('حداقل یک روز فعال باید انتخاب شود.');
    const [student, driver, vehicle] = await Promise.all([
      this.database.db
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, input.driverId), eq(drivers.status, 'ACTIVE')))
        .limit(1)
        .then((rows) => rows[0]),
      this.database.db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.driverId, input.driverId), eq(vehicles.status, 'ACTIVE')))
        .orderBy(desc(vehicles.createdAt))
        .limit(1)
        .then((rows) => rows[0]),
    ]);
    if (!student) throw new NotFoundError('Student', studentId);
    if (!driver) throw new NotFoundError('Driver', input.driverId);
    if (!vehicle)
      throw new ConflictError('DRIVER_HAS_NO_ACTIVE_VEHICLE', 'راننده خودروی فعال ندارد.');
    if (!student.schoolId)
      throw new ConflictError('STUDENT_HAS_NO_SCHOOL', 'دانش‌آموز مدرسه فعال ندارد.');
    const assignmentEventId = randomUUID();
    await this.database.db.transaction(async (txn) => {
      const oldMemberships = await txn
        .select({ id: transportServiceRunStudents.id })
        .from(transportServiceRunStudents)
        .where(
          and(
            eq(transportServiceRunStudents.studentId, studentId),
            eq(transportServiceRunStudents.isActive, true),
          ),
        );
      if (oldMemberships.length)
        await txn
          .update(transportServiceRunStudents)
          .set({ isActive: false })
          .where(
            inArray(
              transportServiceRunStudents.id,
              oldMemberships.map((row) => row.id),
            ),
          );

      for (const direction of ['TO_SCHOOL', 'FROM_SCHOOL'] as const) {
        let [run] = await txn
          .select()
          .from(transportServiceRuns)
          .where(
            and(
              eq(transportServiceRuns.schoolId, student.schoolId),
              eq(transportServiceRuns.driverId, driver.id),
              eq(transportServiceRuns.vehicleId, vehicle.id),
              eq(transportServiceRuns.academicYear, input.academicYear),
              eq(transportServiceRuns.direction, direction),
              eq(transportServiceRuns.isActive, true),
            ),
          )
          .orderBy(asc(transportServiceRuns.sequenceNumber))
          .limit(1);
        if (!run) {
          const [sequence] = await txn
            .select({ value: max(transportServiceRuns.sequenceNumber) })
            .from(transportServiceRuns)
            .where(
              and(
                eq(transportServiceRuns.vehicleId, vehicle.id),
                eq(transportServiceRuns.academicYear, input.academicYear),
                eq(transportServiceRuns.direction, direction),
              ),
            );
          const [created] = await txn
            .insert(transportServiceRuns)
            .values({
              id: randomUUID(),
              schoolId: student.schoolId,
              driverId: driver.id,
              vehicleId: vehicle.id,
              academicYear: input.academicYear,
              title: direction === 'TO_SCHOOL' ? 'سرویس رفت به مدرسه' : 'سرویس برگشت از مدرسه',
              direction,
              sequenceNumber: (sequence?.value ?? 0) + 1,
              scheduledStartTime:
                direction === 'TO_SCHOOL' ? input.toSchoolStartTime : input.fromSchoolStartTime,
              scheduledArrivalTime:
                direction === 'TO_SCHOOL' ? input.toSchoolArrivalTime : input.fromSchoolArrivalTime,
              activeWeekdays: [...new Set(input.activeWeekdays)].sort(),
            })
            .returning();
          run = created;
        }
        const [count] = await txn
          .select({ value: max(transportServiceRunStudents.pickupOrder) })
          .from(transportServiceRunStudents)
          .where(eq(transportServiceRunStudents.serviceRunId, run.id));
        // Admin planning may exceed nominal capacity; the route screen warns before assignment.
        const scheduledStopTime =
          direction === 'TO_SCHOOL' ? input.toSchoolStartTime : input.fromSchoolArrivalTime;
        await txn
          .insert(transportServiceRunStudents)
          .values({
            id: randomUUID(),
            serviceRunId: run.id,
            studentId,
            pickupOrder: (count?.value ?? 0) + 1,
            scheduledStopTime,
          })
          .onConflictDoUpdate({
            target: [
              transportServiceRunStudents.serviceRunId,
              transportServiceRunStudents.studentId,
            ],
            set: { isActive: true, pickupOrder: (count?.value ?? 0) + 1, scheduledStopTime },
          });
      }
      const driverName = `${driver.firstName} ${driver.lastName}`;
      const studentName = `${student.firstName} ${student.lastName}`;
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `STUDENT_DRIVER_ASSIGNED:${assignmentEventId}`,
        userId: student.userId,
        notificationType: 'STUDENT_DRIVER_ASSIGNED',
        title: 'راننده سرویس تعیین شد',
        message: `راننده سرویس ${studentName}، ${driverName} تعیین شد.`,
        relatedEntityType: 'STUDENT',
        relatedEntityId: student.id,
      });
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `DRIVER_STUDENT_ASSIGNED:${assignmentEventId}`,
        userId: driver.userId,
        notificationType: 'DRIVER_STUDENT_ASSIGNED',
        title: 'دانش‌آموز جدید به سرویس افزوده شد',
        message: `${studentName} به سرویس رفت و برگشت شما افزوده شد.`,
        relatedEntityType: 'STUDENT',
        relatedEntityId: student.id,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'DRIVER_ASSIGNED_TO_STUDENT',
        entityType: 'STUDENT',
        entityId: student.id,
        newValues: {
          driverId: driver.id,
          academicYear: input.academicYear,
          activeWeekdays: input.activeWeekdays,
        },
        ipAddress,
      });
    });
    return {
      studentId,
      driverId: driver.id,
      assignments: await this.getStudentAssignments(studentId),
    };
  }

  async enroll(
    userId: string,
    verifiedPhone: string,
    input: DriverEnrollmentDto,
    ipAddress?: string,
  ) {
    if (input.phoneNumber !== verifiedPhone) {
      throw new ValidationError('شماره همراه ثبت‌نام باید با شماره همراه احراز‌شده یکسان باشد.');
    }
    if (!isIranianNationalId(input.nationalId)) {
      throw new ValidationError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
    }
    if (!input.contractFullyRead || !input.contractAccepted) {
      throw new ValidationError('مطالعه کامل و پذیرش قرارداد برای ثبت نهایی الزامی است.');
    }
    const contactNumbers = [
      input.phoneNumber,
      input.secondaryPhoneNumber,
      input.homePhoneNumber,
      input.emergencyPhoneNumber,
    ].filter((value): value is string => Boolean(value));
    if (new Set(contactNumbers).size !== contactNumbers.length) {
      throw new ValidationError(
        'شماره‌های همراه اول، همراه دوم، منزل و تماس اضطراری باید متفاوت باشند.',
      );
    }
    const today = new Date().toISOString().slice(0, 10);
    if (
      [input.insuranceExpiresAt, input.technicalInspectionExpiresAt].some((date) => date < today)
    ) {
      throw new ValidationError('تاریخ انقضای مدارک نمی‌تواند گذشته باشد.');
    }
    const existing = await this.database.db
      .select({ id: drivers.id })
      .from(drivers)
      .where(
        or(eq(drivers.nationalId, input.nationalId), eq(drivers.phoneNumber, input.phoneNumber)),
      )
      .limit(1);
    if (existing.length)
      throw new ValidationError('راننده‌ای با این کد ملی یا شماره همراه قبلاً ثبت شده است.');

    const uploads = await this.database.db
      .select()
      .from(driverDocumentUploads)
      .where(
        and(
          eq(driverDocumentUploads.userId, userId),
          inArray(driverDocumentUploads.id, [
            input.driverPhotoUploadId,
            input.vehiclePhotoUploadId,
          ]),
          eq(driverDocumentUploads.status, 'AUTHORIZED'),
        ),
      );
    const driverPhoto = uploads.find(
      (upload) => upload.id === input.driverPhotoUploadId && upload.documentType === 'DRIVER_PHOTO',
    );
    const vehiclePhoto = uploads.find(
      (upload) =>
        upload.id === input.vehiclePhotoUploadId && upload.documentType === 'VEHICLE_PHOTO',
    );
    if (!driverPhoto || !vehiclePhoto)
      throw new ValidationError('بارگذاری هر دو عکس راننده و خودرو الزامی است.');
    for (const upload of [driverPhoto, vehiclePhoto]) {
      const metadata = await this.storage.headObject(upload.objectKey);
      if (metadata.size < 1 || metadata.size > 5 * 1024 * 1024)
        throw new ValidationError('حجم عکس باید حداکثر ۵ مگابایت باشد.');
      const body = await this.storage.getObject(upload.objectKey, 5 * 1024 * 1024);
      const image = await sharp(body)
        .metadata()
        .catch(() => null);
      if (!image?.width || !image.height || !['jpeg', 'png'].includes(image.format ?? '')) {
        throw new ValidationError('فایل بارگذاری‌شده یک عکس JPG یا PNG معتبر نیست.');
      }
    }

    const acceptedAt = new Date();
    return this.database.db.transaction(async (txn) => {
      const [driver] = await txn
        .insert(drivers)
        .values({
          userId,
          firstName: input.firstName,
          lastName: input.lastName,
          fatherName: input.fatherName,
          nationalId: input.nationalId,
          phoneNumber: input.phoneNumber,
          secondaryPhoneNumber: input.secondaryPhoneNumber || null,
          homePhoneNumber: input.homePhoneNumber || null,
          emergencyPhoneNumber: input.emergencyPhoneNumber,
          emergencyFirstName: input.emergencyFirstName,
          emergencyLastName: input.emergencyLastName,
          emergencyRelationship: input.emergencyRelationship,
          gender: input.gender,
          education: input.education,
          iban: input.iban,
          cardNumber: input.cardNumber,
          bankName: input.bankName,
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
        })
        .returning({ id: drivers.id });
      const [vehicle] = await txn
        .insert(vehicles)
        .values({
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
        })
        .returning({ id: vehicles.id });
      await txn.insert(transportDocuments).values([
        {
          driverId: driver.id,
          documentType: 'DRIVER_PHOTO',
          objectKey: driverPhoto.objectKey,
          mimeType: driverPhoto.mimeType,
        },
        {
          vehicleId: vehicle.id,
          documentType: 'VEHICLE_PHOTO',
          objectKey: vehiclePhoto.objectKey,
          mimeType: vehiclePhoto.mimeType,
        },
      ]);
      await txn
        .update(driverDocumentUploads)
        .set({ status: 'LINKED' })
        .where(inArray(driverDocumentUploads.id, [driverPhoto.id, vehiclePhoto.id]));
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
        newValues: {
          status: 'ACTIVE',
          vehicleType: input.vehicleType,
          ownershipType: input.ownershipType,
          usageType: input.usageType,
        },
        ipAddress,
      });
      return {
        driverId: driver.id,
        vehicleId: vehicle.id,
        contractVersion: CONTRACT_VERSION,
        acceptedAt,
      };
    });
  }

  async replacePhoto(userId: string, uploadId: string, ipAddress?: string) {
    const [upload] = await this.database.db
      .select()
      .from(driverDocumentUploads)
      .where(
        and(
          eq(driverDocumentUploads.id, uploadId),
          eq(driverDocumentUploads.userId, userId),
          eq(driverDocumentUploads.status, 'AUTHORIZED'),
        ),
      )
      .limit(1);
    if (!upload) throw new ValidationError('بارگذاری معتبر و متعلق به راننده پیدا نشد.');
    const metadata = await this.storage.headObject(upload.objectKey);
    if (metadata.size < 1 || metadata.size > 5 * 1024 * 1024)
      throw new ValidationError('حجم عکس باید حداکثر ۵ مگابایت باشد.');
    const file = await this.storage.getObject(upload.objectKey, 5 * 1024 * 1024);
    if (upload.mimeType === 'application/pdf') {
      if (file.subarray(0, 5).toString('ascii') !== '%PDF-')
        throw new ValidationError('فایل بارگذاری‌شده یک PDF معتبر نیست.');
    } else {
      const image = await sharp(file)
        .metadata()
        .catch(() => null);
      if (!image?.width || !image.height || !['jpeg', 'png'].includes(image.format ?? ''))
        throw new ValidationError('فایل بارگذاری‌شده یک عکس JPG یا PNG معتبر نیست.');
    }
    const [driver] = await this.database.db
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.userId, userId))
      .limit(1);
    if (!driver) throw new ValidationError('پروفایل راننده پیدا نشد.');
    const [vehicle] = await this.database.db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.driverId, driver.id))
      .limit(1);
    const vehicleDocument = VEHICLE_DOCUMENT_TYPES.has(upload.documentType);
    if (vehicleDocument && !vehicle) throw new ValidationError('خودروی راننده پیدا نشد.');
    const existingRows = await this.database.db
      .select()
      .from(transportDocuments)
      .where(
        and(
          eq(transportDocuments.documentType, upload.documentType),
          vehicleDocument
            ? eq(transportDocuments.vehicleId, vehicle!.id)
            : eq(transportDocuments.driverId, driver.id),
        ),
      )
      .orderBy(desc(transportDocuments.createdAt))
      .limit(1);
    if (existingRows[0] && existingRows[0].reviewStatus !== 'REJECTED')
      throw new ConflictError(
        'DRIVER_DOCUMENT_ALREADY_UPLOADED',
        'این تصویر قبلاً ثبت شده و فقط پس از رد مدیریت قابل بارگذاری مجدد است.',
      );
    await this.database.db.transaction(async (txn) => {
      await txn.insert(transportDocuments).values(
        vehicleDocument
          ? {
              vehicleId: vehicle!.id,
              documentType: upload.documentType,
              objectKey: upload.objectKey,
              mimeType: upload.mimeType,
            }
          : {
              driverId: driver.id,
              documentType: upload.documentType,
              objectKey: upload.objectKey,
              mimeType: upload.mimeType,
            },
      );
      await txn
        .update(driverDocumentUploads)
        .set({ status: 'LINKED' })
        .where(eq(driverDocumentUploads.id, upload.id));
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
