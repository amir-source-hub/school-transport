import { Injectable } from '@nestjs/common';
import { and, eq, lt, inArray } from 'drizzle-orm';
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
} from '../../../database/schemas';
import { generateId } from '../../../common/utils';
import { OnboardingSessionResult } from '../domain/auth.types';
import { InAppNotificationService } from '../../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly notifications: InAppNotificationService,
  ) {}

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
    return Boolean(row);
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
