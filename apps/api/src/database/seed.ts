import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  adminUsers,
  contracts,
  emergencyContacts,
  familyAddresses,
  notifications,
  parents,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  registrationPrices,
  schools,
  serviceRegistrations,
  students,
  users,
} from './schemas';

export const SEED_CREDENTIALS = {
  parent: { username: 'demo-parent', phoneNumber: '09121111111' },
  admin: { username: 'demo-admin', phoneNumber: '09120000000' },
} as const;

const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  admin: '00000000-0000-4000-8000-000000000002',
  mother: '00000000-0000-4000-8000-000000000003',
  father: '00000000-0000-4000-8000-000000000004',
  address: '00000000-0000-4000-8000-000000000005',
  emergency: '00000000-0000-4000-8000-000000000006',
  school: '00000000-0000-4000-8000-000000000007',
  student: '00000000-0000-4000-8000-000000000008',
  school2: '00000000-0000-4000-8000-000000000009',
  school3: '00000000-0000-4000-8000-000000000010',
  student2: '00000000-0000-4000-8000-000000000011',
  student3: '00000000-0000-4000-8000-000000000012',
  registration: '00000000-0000-4000-8000-000000000013',
  registration2: '00000000-0000-4000-8000-000000000014',
  price: '00000000-0000-4000-8000-000000000015',
  plan: '00000000-0000-4000-8000-000000000016',
  prepayment: '00000000-0000-4000-8000-000000000017',
  installment1: '00000000-0000-4000-8000-000000000018',
  installment2: '00000000-0000-4000-8000-000000000019',
  installment3: '00000000-0000-4000-8000-000000000020',
  installment4: '00000000-0000-4000-8000-000000000021',
  transaction: '00000000-0000-4000-8000-000000000022',
  contract: '00000000-0000-4000-8000-000000000023',
  notification1: '00000000-0000-4000-8000-000000000024',
  notification2: '00000000-0000-4000-8000-000000000025',
} as const;

export async function seedDatabase(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for seeding.');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    await db
      .insert(users)
      .values({
        id: ids.user,
        username: SEED_CREDENTIALS.parent.username,
        phoneNumber: SEED_CREDENTIALS.parent.phoneNumber,
      })
      .onConflictDoNothing();
    await db
      .insert(adminUsers)
      .values({
        id: ids.admin,
        username: SEED_CREDENTIALS.admin.username,
        firstName: 'Demo',
        lastName: 'Admin',
        phoneNumber: SEED_CREDENTIALS.admin.phoneNumber,
      })
      .onConflictDoNothing();
    await db
      .insert(schools)
      .values([
        {
          id: ids.school,
          name: 'دبستان اندیشه روشن',
          schoolType: 'PUBLIC',
          genderType: 'MIXED',
          province: 'تهران',
          city: 'تهران',
          district: '2',
          address: 'سعادت‌آباد، بلوار دریا',
          educationOptions: [{ level: 'ابتدایی', grades: ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'] }],
        },
        {
          id: ids.school2,
          name: 'مجتمع آموزشی مهرآیین',
          schoolType: 'PRIVATE',
          genderType: 'FEMALE',
          province: 'تهران',
          city: 'تهران',
          district: '3',
          address: 'پاسداران، خیابان گلستان',
          educationOptions: [
            { level: 'ابتدایی', grades: ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'] },
            { level: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
          ],
        },
        {
          id: ids.school3,
          name: 'دبیرستان فرهنگ',
          schoolType: 'PRIVATE',
          genderType: 'MALE',
          province: 'تهران',
          city: 'تهران',
          district: '6',
          address: 'یوسف‌آباد، خیابان بیستم',
          educationOptions: [
            { level: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
            { level: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] },
          ],
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(parents)
      .values([
        {
          id: ids.mother,
          userId: ids.user,
          parentType: 'MOTHER',
          firstName: 'Sara',
          lastName: 'Ahmadi',
          nationalId: '1234567891',
          phoneNumber: '09121111111',
          isPrimaryContact: true,
          phoneVerifiedAt: new Date(),
        },
        {
          id: ids.father,
          userId: ids.user,
          parentType: 'FATHER',
          firstName: 'Ali',
          lastName: 'Ahmadi',
          nationalId: '0013546789',
          phoneNumber: '09122222222',
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(familyAddresses)
      .values({
        id: ids.address,
        userId: ids.user,
        title: 'Home',
        province: 'Tehran',
        city: 'Tehran',
        district: '2',
        streetAddress: 'Demo family address',
        postalCode: '1234567890',
      })
      .onConflictDoNothing();
    await db
      .insert(emergencyContacts)
      .values({
        id: ids.emergency,
        userId: ids.user,
        firstName: 'Reza',
        lastName: 'Karimi',
        relationship: 'UNCLE',
        phoneNumber: '09123333333',
      })
      .onConflictDoNothing();
    await db
      .insert(students)
      .values([
        {
          id: ids.student,
          userId: ids.user,
          schoolId: ids.school,
          firstName: 'نیکا',
          lastName: 'احمدی',
          nationalId: '0023546789',
          grade: '4',
        },
        {
          id: ids.student2,
          userId: ids.user,
          schoolId: ids.school2,
          firstName: 'هانا',
          lastName: 'احمدی',
          nationalId: '0023546797',
          grade: '1',
        },
        {
          id: ids.student3,
          userId: ids.user,
          schoolId: ids.school3,
          firstName: 'آرین',
          lastName: 'احمدی',
          nationalId: '0023546800',
          grade: '8',
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(serviceRegistrations)
      .values([
        {
          id: ids.registration,
          studentId: ids.student,
          academicYear: '1405-1406',
          serviceType: 'ROUND_TRIP',
          selectedAddressId: ids.address,
          requestedStartDate: new Date('2026-09-23T04:30:00Z'),
          registrationStatus: 'CONTRACT_ACCEPTED',
          submittedAt: new Date('2026-07-01T08:00:00Z'),
          reviewedAt: new Date('2026-07-03T08:00:00Z'),
          reviewedByAdminId: ids.admin,
          parentNotes: 'نیاز به هماهنگی تلفنی پیش از اولین سرویس.',
        },
        {
          id: ids.registration2,
          studentId: ids.student2,
          academicYear: '1405-1406',
          serviceType: 'ONE_WAY',
          selectedAddressId: ids.address,
          registrationStatus: 'UNDER_REVIEW',
          submittedAt: new Date('2026-07-20T08:00:00Z'),
          parentNotes: 'سرویس فقط برای مسیر رفت.',
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(registrationPrices)
      .values({
        id: ids.price,
        registrationId: ids.registration,
        totalAmount: 120_000_000,
        currency: 'IRR',
        prepaymentAmount: 40_000_000,
        installmentCount: 4,
        priceStatus: 'ACCEPTED',
        setByAdminId: ids.admin,
        parentConfirmedAt: new Date('2026-07-05T08:00:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(paymentPlans)
      .values({
        id: ids.plan,
        registrationPriceId: ids.price,
        planType: 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS',
        totalAmount: 120_000_000,
        prepaymentAmount: 40_000_000,
        remainingInstallmentAmount: 80_000_000,
        installmentCount: 4,
        planStatus: 'ACTIVE',
        activatedAt: new Date('2026-07-06T08:00:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(paymentScheduleItems)
      .values([
        { id: ids.prepayment, paymentPlanId: ids.plan, itemType: 'PREPAYMENT', sequenceNumber: 0, amount: 40_000_000, dueDate: new Date('2026-07-10T08:00:00Z'), itemStatus: 'PAID', paidAmount: 40_000_000, paidAt: new Date('2026-07-08T08:00:00Z') },
        { id: ids.installment1, paymentPlanId: ids.plan, itemType: 'INSTALLMENT', sequenceNumber: 1, amount: 20_000_000, dueDate: new Date('2026-09-23T08:00:00Z') },
        { id: ids.installment2, paymentPlanId: ids.plan, itemType: 'INSTALLMENT', sequenceNumber: 2, amount: 20_000_000, dueDate: new Date('2026-10-23T08:00:00Z') },
        { id: ids.installment3, paymentPlanId: ids.plan, itemType: 'INSTALLMENT', sequenceNumber: 3, amount: 20_000_000, dueDate: new Date('2026-11-22T08:00:00Z') },
        { id: ids.installment4, paymentPlanId: ids.plan, itemType: 'INSTALLMENT', sequenceNumber: 4, amount: 20_000_000, dueDate: new Date('2026-12-22T08:00:00Z') },
      ])
      .onConflictDoNothing();
    await db
      .insert(paymentTransactions)
      .values({
        id: ids.transaction,
        paymentPlanId: ids.plan,
        paymentScheduleItemId: ids.prepayment,
        userId: ids.user,
        amount: 40_000_000,
        paymentMethod: 'ONLINE',
        gatewayName: 'SEED_GATEWAY',
        gatewayTransactionId: 'seed-transaction-0001',
        idempotencyKey: 'seed-payment-0001',
        transactionStatus: 'SUCCEEDED',
        verifiedAt: new Date('2026-07-08T08:01:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(contracts)
      .values({
        id: ids.contract,
        registrationId: ids.registration,
        registrationPriceId: ids.price,
        paymentPlanId: ids.plan,
        contractNumber: 'ST-1405-0001',
        contractStatus: 'ACCEPTED',
        selectedAddressId: ids.address,
        contractDataSnapshot: JSON.stringify({ academicYear: '1405-1406', serviceType: 'ROUND_TRIP', totalAmount: 120_000_000 }),
        versionNumber: 1,
        generatedByAdminId: ids.admin,
        generatedAt: new Date('2026-07-06T08:00:00Z'),
        acceptedAt: new Date('2026-07-07T08:00:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(notifications)
      .values([
        {
          id: ids.notification1,
          userId: ids.user,
          notificationType: 'PAYMENT_REMINDER',
          title: 'یادآوری سررسید قسط',
          message: 'قسط اول سرویس نیکا در ابتدای مهرماه سررسید می‌شود.',
          relatedEntityType: 'PAYMENT_PLAN',
          relatedEntityId: ids.plan,
          notificationStatus: 'SENT',
          sentAt: new Date('2026-07-24T08:00:00Z'),
        },
        {
          id: ids.notification2,
          userId: ids.user,
          notificationType: 'REGISTRATION_UPDATE',
          title: 'درخواست هانا در حال بررسی است',
          message: 'کارشناسان در حال بررسی مسیر و ظرفیت مدرسه هستند.',
          relatedEntityType: 'SERVICE_REGISTRATION',
          relatedEntityId: ids.registration2,
          notificationStatus: 'PENDING',
          scheduledAt: new Date('2026-07-27T08:00:00Z'),
        },
      ])
      .onConflictDoNothing();
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => console.log('Seed data is ready.'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
