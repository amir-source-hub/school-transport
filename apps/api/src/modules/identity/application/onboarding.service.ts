import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt, inArray, sql } from 'drizzle-orm';
import { addSeconds, isPast } from 'date-fns';
import { createHash, randomBytes } from 'node:crypto';
import { ConfigService } from '../../../config/config.service';
import { DatabaseService } from '../../../database/database.service';
import {
  onboardingSessions,
  users,
  parents,
  contracts,
  serviceRegistrations,
  students,
  schools,
  familyAddresses,
  emergencyContacts,
  studentPhotoUploads,
  notifications,
  notificationOutbox,
  drivers,
} from '../../../database/schemas';
import { generateId } from '../../../common/utils';
import { OnboardingSessionResult } from '../domain/auth.types';
import { InAppNotificationService } from '../../../infrastructure/notifications/in-app-notification.service';
import { S3_CLIENT, type S3Storage } from '../../../infrastructure/s3/s3-storage.port';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly notifications: InAppNotificationService,
    @Inject(S3_CLIENT) private readonly storage: S3Storage,
  ) {}

  async restartPendingDraft(userId: string): Promise<void> {
    const [account] = await this.db.db
      .select({ status: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!account || account.status !== 'PENDING') return;
    const photos = await this.db.db
      .select({
        rawKey: studentPhotoUploads.rawKey,
        canonicalKey: studentPhotoUploads.canonicalKey,
      })
      .from(studentPhotoUploads)
      .where(eq(studentPhotoUploads.accountUserId, userId));
    await this.db.db.transaction(async (txn) => {
      await txn.execute(sql`select set_config('app.family_erasure', 'on', true)`);
      await txn.delete(students).where(eq(students.userId, userId));
      await txn.delete(studentPhotoUploads).where(eq(studentPhotoUploads.accountUserId, userId));
      await txn.delete(parents).where(eq(parents.userId, userId));
      await txn.delete(familyAddresses).where(eq(familyAddresses.userId, userId));
      await txn.delete(emergencyContacts).where(eq(emergencyContacts.userId, userId));
      await txn.delete(notificationOutbox).where(eq(notificationOutbox.userId, userId));
      await txn.delete(notifications).where(eq(notifications.userId, userId));
      await txn
        .update(onboardingSessions)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(
          and(eq(onboardingSessions.userId, userId), eq(onboardingSessions.status, 'PENDING')),
        );
    });
    await Promise.all(
      photos.flatMap(({ rawKey, canonicalKey }) =>
        [rawKey, canonicalKey]
          .filter((key): key is string => Boolean(key))
          .map((key) => this.storage.deleteObject(key).catch(() => undefined)),
      ),
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async beginOrResume(userId: string, phoneNumber: string): Promise<OnboardingSessionResult> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const expiresAt = addSeconds(now, this.config.onboardingSessionTtlSeconds);

    const existing = await this.db.db
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.phoneNumber, phoneNumber),
          eq(onboardingSessions.status, 'PENDING'),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await this.db.db
        .update(onboardingSessions)
        .set({
          onboardingTokenHash: tokenHash,
          verifiedAt: now,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(onboardingSessions.id, existing[0].id));
      return {
        sessionId: existing[0].id,
        token,
        expiresAt,
        currentStep: existing[0].currentStep,
      };
    }

    const [inserted] = await this.db.db
      .insert(onboardingSessions)
      .values({
        id: generateId(),
        phoneNumber,
        userId,
        status: 'PENDING',
        onboardingTokenHash: tokenHash,
        verifiedAt: now,
        expiresAt,
      })
      .returning();
    return {
      sessionId: inserted.id,
      token,
      expiresAt,
      currentStep: inserted.currentStep,
    };
  }

  async resolve(token: string): Promise<
    | {
        id: string;
        userId: string;
        phoneNumber: string;
        currentStep: string | null;
        expiresAt: Date;
      }
    | undefined
  > {
    const [session] = await this.db.db
      .select()
      .from(onboardingSessions)
      .where(
        and(
          eq(onboardingSessions.onboardingTokenHash, this.hashToken(token)),
          eq(onboardingSessions.status, 'PENDING'),
        ),
      )
      .limit(1);
    if (!session || isPast(session.expiresAt)) return undefined;
    return session;
  }

  async isPanelReady(userId: string): Promise<boolean> {
    const [driver] = await this.db.db.select({ id: drivers.id }).from(drivers).where(eq(drivers.userId, userId)).limit(1);
    if (driver) return true;
    const [row] = await this.db.db
      .select({ id: contracts.id })
      .from(contracts)
      .innerJoin(serviceRegistrations, eq(serviceRegistrations.id, contracts.registrationId))
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .where(
        and(
          eq(students.userId, userId),
          eq(contracts.contractStatus, 'ACCEPTED'),
          inArray(serviceRegistrations.registrationStatus, ['CONTRACT_ACCEPTED', 'ENROLLED']),
        ),
      )
      .limit(1);
    if (row) return true;
    const [specialEnrollment] = await this.db.db
      .select({ id: serviceRegistrations.id })
      .from(serviceRegistrations)
      .innerJoin(students, eq(students.id, serviceRegistrations.studentId))
      .innerJoin(schools, eq(schools.id, students.schoolId))
      .where(
        and(
          eq(students.userId, userId),
          eq(schools.schoolType, 'SPECIAL'),
          eq(serviceRegistrations.registrationStatus, 'ENROLLED'),
        ),
      )
      .limit(1);
    return Boolean(specialEnrollment);
  }

  async completeOnboarding(sessionId: string, userId: string): Promise<void> {
    const now = new Date();
    await this.db.db.transaction(async (txn) => {
      await txn
        .update(users)
        .set({ accountStatus: 'ACTIVE', lastLoginAt: now, updatedAt: now })
        .where(eq(users.id, userId));
      await txn
        .update(parents)
        .set({ phoneVerifiedAt: now, updatedAt: now })
        .where(eq(parents.userId, userId));
      await txn
        .update(onboardingSessions)
        .set({
          status: 'COMPLETED',
          currentStep: 'DONE',
          completedAt: now,
          updatedAt: now,
        })
        .where(eq(onboardingSessions.id, sessionId));
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `ACCOUNT_REGISTERED:${userId}`,
        userId,
        notificationType: 'ACCOUNT_REGISTERED',
        title: 'ثبت‌نام حساب با موفقیت انجام شد',
        message: 'حساب خانواده ایجاد شد. پیش‌پرداخت و وضعیت رسید را از پنل پیگیری کنید.',
        relatedEntityType: 'USER',
        relatedEntityId: userId,
      });
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `WELCOME:${userId}`,
        userId,
        notificationType: 'WELCOME',
        title: 'به پنل خانواده خوش آمدید',
        message:
          'از این بخش می‌توانید ثبت‌نام، تصمیم‌های مدیریت، قراردادها، پرداخت‌ها و سررسیدها را دنبال کنید.',
      });
    });
  }

  async expireExpired(): Promise<number> {
    const expired = await this.db.db
      .select({ id: onboardingSessions.id })
      .from(onboardingSessions)
      .where(
        and(eq(onboardingSessions.status, 'PENDING'), lt(onboardingSessions.expiresAt, new Date())),
      );
    if (expired.length === 0) return 0;
    await this.db.db
      .update(onboardingSessions)
      .set({ status: 'EXPIRED', updatedAt: new Date() })
      .where(
        inArray(
          onboardingSessions.id,
          expired.map((row) => row.id),
        ),
      );
    return expired.length;
  }
}
