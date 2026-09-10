import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, isNull } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { Pool } from 'pg';
import { seedRouteAssignments } from './seed-route-assignments';
import {
  adminUsers,
  contracts,
  emergencyContacts,
  familyAddresses,
  notifications,
  offlinePaymentDestinations,
  parents,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  registrationPrices,
  schoolManagerAssignments,
  schoolManagerUsers,
  schools,
  serviceRegistrations,
  students,
  users,
  drivers,
  vehicles,
  transportServiceRuns,
} from './schemas';

export const SEED_CREDENTIALS = {
  parent: { username: 'demo-parent', phoneNumber: '09121111111', nationalId: '0084575948' },
  secondParent: { phoneNumber: '09122222222', nationalId: '0084575956' },
  driver: { username: 'demo-driver', phoneNumber: '09124444444', nationalId: '0084575964' },
  additionalParents: [
    { username: 'demo-parent-2', phoneNumber: '09121111112', nationalId: '0845760009' },
    { username: 'demo-parent-3', phoneNumber: '09121111113', nationalId: '0845760041' },
  ],
  additionalDrivers: [
    { username: 'demo-driver-2', phoneNumber: '09124444445', nationalId: '0845760076' },
    { username: 'demo-driver-3', phoneNumber: '09124444446', nationalId: '0845760084' },
  ],
  admin: {
    username: 'demo-admin',
    phoneNumber: '09120000000',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'demo-admin-password',
  },
  manager: {
    username: '09120000001',
    phoneNumber: '09120000001',
    password: process.env.SEED_MANAGER_PASSWORD ?? 'demo-manager-password',
  },
  additionalManagers: [
    { username: '09120000002', phoneNumber: '09120000002' },
    { username: '09120000003', phoneNumber: '09120000003' },
    { username: '09120000004', phoneNumber: '09120000004' },
  ],
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
  offlineDestination: '00000000-0000-4000-8000-000000000026',
  manager: '00000000-0000-4000-8000-000000000027',
  managerAssignment: '00000000-0000-4000-8000-000000000028',
  driverUser: '00000000-0000-4000-8000-000000000029',
  driver: '00000000-0000-4000-8000-000000000030',
  vehicle: '00000000-0000-4000-8000-000000000031',
  routeToSchool: '00000000-0000-4000-8000-000000000032',
  routeFromSchool: '00000000-0000-4000-8000-000000000033',
  routeMemberToSchool: '00000000-0000-4000-8000-000000000034',
  routeMemberFromSchool: '00000000-0000-4000-8000-000000000035',
  family2: '00000000-0000-4000-8000-000000000036',
  family2Mother: '00000000-0000-4000-8000-000000000037',
  family2Father: '00000000-0000-4000-8000-000000000038',
  family2Address: '00000000-0000-4000-8000-000000000039',
  family2Emergency: '00000000-0000-4000-8000-000000000040',
  student4: '00000000-0000-4000-8000-000000000041',
  student5: '00000000-0000-4000-8000-000000000042',
  family3: '00000000-0000-4000-8000-000000000043',
  family3Mother: '00000000-0000-4000-8000-000000000044',
  family3Address: '00000000-0000-4000-8000-000000000045',
  family3Emergency: '00000000-0000-4000-8000-000000000046',
  student6: '00000000-0000-4000-8000-000000000047',
  student7: '00000000-0000-4000-8000-000000000048',
  school4: '00000000-0000-4000-8000-000000000049',
  manager2: '00000000-0000-4000-8000-000000000050',
  managerAssignment2: '00000000-0000-4000-8000-000000000051',
  manager3: '00000000-0000-4000-8000-000000000052',
  managerAssignment3: '00000000-0000-4000-8000-000000000053',
  manager4: '00000000-0000-4000-8000-000000000054',
  managerAssignment4: '00000000-0000-4000-8000-000000000055',
  driverUser2: '00000000-0000-4000-8000-000000000056',
  driver2: '00000000-0000-4000-8000-000000000057',
  vehicle2: '00000000-0000-4000-8000-000000000058',
  driverUser3: '00000000-0000-4000-8000-000000000059',
  driver3: '00000000-0000-4000-8000-000000000060',
  vehicle3: '00000000-0000-4000-8000-000000000061',
  routeSchool2To: '00000000-0000-4000-8000-000000000062',
  routeSchool2From: '00000000-0000-4000-8000-000000000063',
  routeSchool3To: '00000000-0000-4000-8000-000000000064',
  routeSchool3From: '00000000-0000-4000-8000-000000000065',
  routeMember4To: '00000000-0000-4000-8000-000000000066',
  routeMember5To: '00000000-0000-4000-8000-000000000067',
  routeMember4From: '00000000-0000-4000-8000-000000000068',
  routeMember5From: '00000000-0000-4000-8000-000000000069',
  routeMember6To: '00000000-0000-4000-8000-000000000070',
  routeMember6From: '00000000-0000-4000-8000-000000000071',
  registration3: '00000000-0000-4000-8000-000000000072',
  registration4: '00000000-0000-4000-8000-000000000073',
  registration5: '00000000-0000-4000-8000-000000000074',
  registration6: '00000000-0000-4000-8000-000000000075',
} as const;

export async function seedDatabase(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for seeding.');
  if (SEED_CREDENTIALS.admin.password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 8 characters.');
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    const adminPasswordHash = await argon2.hash(SEED_CREDENTIALS.admin.password);
    await db
      .insert(users)
      .values({
        id: ids.user,
        username: SEED_CREDENTIALS.parent.username,
        phoneNumber: SEED_CREDENTIALS.parent.phoneNumber,
        studentLimit: 5,
      })
      .onConflictDoNothing();
    await db
      .update(users)
      .set({
        phoneNumber: SEED_CREDENTIALS.parent.phoneNumber,
        studentLimit: 5,
        accountStatus: 'ACTIVE',
      })
      .where(eq(users.id, ids.user));
    await db
      .insert(users)
      .values({
        id: ids.driverUser,
        username: SEED_CREDENTIALS.driver.username,
        phoneNumber: SEED_CREDENTIALS.driver.phoneNumber,
        accountStatus: 'ACTIVE',
      })
      .onConflictDoNothing();
    await db
      .insert(users)
      .values([
        {
          id: ids.family2,
          username: SEED_CREDENTIALS.additionalParents[0].username,
          phoneNumber: SEED_CREDENTIALS.additionalParents[0].phoneNumber,
          studentLimit: 4,
        },
        {
          id: ids.family3,
          username: SEED_CREDENTIALS.additionalParents[1].username,
          phoneNumber: SEED_CREDENTIALS.additionalParents[1].phoneNumber,
          studentLimit: 4,
        },
        {
          id: ids.driverUser2,
          username: SEED_CREDENTIALS.additionalDrivers[0].username,
          phoneNumber: SEED_CREDENTIALS.additionalDrivers[0].phoneNumber,
        },
        {
          id: ids.driverUser3,
          username: SEED_CREDENTIALS.additionalDrivers[1].username,
          phoneNumber: SEED_CREDENTIALS.additionalDrivers[1].phoneNumber,
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(adminUsers)
      .values({
        id: ids.admin,
        username: SEED_CREDENTIALS.admin.username,
        firstName: 'مدیر',
        lastName: 'سامانه',
        phoneNumber: SEED_CREDENTIALS.admin.phoneNumber,
        passwordHash: adminPasswordHash,
      })
      .onConflictDoNothing();
    await db
      .update(adminUsers)
      .set({ passwordHash: adminPasswordHash })
      .where(and(eq(adminUsers.id, ids.admin), isNull(adminUsers.passwordHash)));
    const managerPasswordHash = await argon2.hash(SEED_CREDENTIALS.manager.password);
    await db
      .insert(schoolManagerUsers)
      .values({
        id: ids.manager,
        username: SEED_CREDENTIALS.manager.username,
        firstName: 'مریم',
        lastName: 'رضایی',
        phoneNumber: SEED_CREDENTIALS.manager.phoneNumber,
        passwordHash: managerPasswordHash,
        mustChangeCredentials: false,
      })
      .onConflictDoNothing();
    await db
      .update(schoolManagerUsers)
      .set({ firstName: 'مریم', lastName: 'رضایی' })
      .where(eq(schoolManagerUsers.id, ids.manager));
    await db
      .insert(schoolManagerUsers)
      .values([
        {
          id: ids.manager2,
          username: SEED_CREDENTIALS.additionalManagers[0].username,
          firstName: 'زهرا',
          lastName: 'کریمی',
          phoneNumber: SEED_CREDENTIALS.additionalManagers[0].phoneNumber,
          passwordHash: managerPasswordHash,
          mustChangeCredentials: false,
        },
        {
          id: ids.manager3,
          username: SEED_CREDENTIALS.additionalManagers[1].username,
          firstName: 'محمد',
          lastName: 'اکبری',
          phoneNumber: SEED_CREDENTIALS.additionalManagers[1].phoneNumber,
          passwordHash: managerPasswordHash,
          mustChangeCredentials: false,
        },
        {
          id: ids.manager4,
          username: SEED_CREDENTIALS.additionalManagers[2].username,
          firstName: 'لیلا',
          lastName: 'نوری',
          phoneNumber: SEED_CREDENTIALS.additionalManagers[2].phoneNumber,
          passwordHash: managerPasswordHash,
          mustChangeCredentials: false,
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(offlinePaymentDestinations)
      .values({
        id: ids.offlineDestination,
        version: 1,
        accountOwner: 'شرکت ثمین گشت مهر ایرانیان',
        bankName: 'بانک سپه',
        cardNumber: '5892107050025868',
        iban: 'IR250150000000848301707305',
        accountNumber: '848301707305',
        instructions: 'پس از واریز، تصویر رسید و شماره پیگیری بانکی را در پنل ثبت کنید.',
        createdByAdminId: ids.admin,
      })
      .onConflictDoNothing();
    await db
      .insert(drivers)
      .values({
        id: ids.driver,
        userId: ids.driverUser,
        firstName: 'حسین',
        lastName: 'محمدی',
        fatherName: 'رضا',
        nationalId: SEED_CREDENTIALS.driver.nationalId,
        phoneNumber: SEED_CREDENTIALS.driver.phoneNumber,
        secondaryPhoneNumber: '09125555555',
        homePhoneNumber: '02144225577',
        emergencyPhoneNumber: '09126666666',
        emergencyFirstName: 'احمد',
        emergencyLastName: 'محمدی',
        emergencyRelationship: 'برادر',
        gender: 'MALE',
        education: 'DIPLOMA',
        // Dates are persisted as Gregorian ISO values; the UI renders them in Jalali.
        licenseExpiresAt: '2031-09-22', // 1410/06/31
        streetAddress: 'تهران، سعادت‌آباد، خیابان سرو غربی',
        postalCode: '1998877665',
        province: 'تهران',
        city: 'تهران',
        municipalityDistrict: '۲',
        latitude: 35.7781,
        longitude: 51.3655,
        contractVersion: 'driver-v1',
        contractAcceptedAt: new Date('2026-08-20T08:00:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(drivers)
      .values([
        {
          id: ids.driver2,
          userId: ids.driverUser2,
          firstName: 'مجتبی',
          lastName: 'کاظمی',
          fatherName: 'حسن',
          nationalId: SEED_CREDENTIALS.additionalDrivers[0].nationalId,
          phoneNumber: SEED_CREDENTIALS.additionalDrivers[0].phoneNumber,
          secondaryPhoneNumber: '09125555556',
          homePhoneNumber: '02122558811',
          emergencyPhoneNumber: '09126666667',
          emergencyFirstName: 'حامد',
          emergencyLastName: 'کاظمی',
          emergencyRelationship: 'برادر',
          gender: 'MALE',
          education: 'ASSOCIATE',
          licenseExpiresAt: '2030-07-23',
          streetAddress: 'تهران، پاسداران، خیابان گلستان',
          postalCode: '1666677889',
          province: 'تهران',
          city: 'تهران',
          municipalityDistrict: '۳',
          latitude: 35.7868,
          longitude: 51.4552,
          referrerName: 'حمید احمدی',
          referrerPhoneNumber: '09127770001',
          contractVersion: 'driver-v1',
          contractAcceptedAt: new Date('2026-08-21T08:00:00Z'),
        },
        {
          id: ids.driver3,
          userId: ids.driverUser3,
          firstName: 'رضا',
          lastName: 'مرادی',
          fatherName: 'کریم',
          nationalId: SEED_CREDENTIALS.additionalDrivers[1].nationalId,
          phoneNumber: SEED_CREDENTIALS.additionalDrivers[1].phoneNumber,
          homePhoneNumber: '02188773322',
          emergencyPhoneNumber: '09126666668',
          emergencyFirstName: 'علی',
          emergencyLastName: 'مرادی',
          emergencyRelationship: 'برادر',
          gender: 'MALE',
          education: 'BACHELOR',
          licenseExpiresAt: '2032-01-20',
          streetAddress: 'تهران، یوسف‌آباد، خیابان چهل‌وپنجم',
          postalCode: '1433388991',
          province: 'تهران',
          city: 'تهران',
          municipalityDistrict: '۶',
          latitude: 35.7351,
          longitude: 51.4073,
          contractVersion: 'driver-v1',
          contractAcceptedAt: new Date('2026-08-22T08:00:00Z'),
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(vehicles)
      .values({
        id: ids.vehicle,
        driverId: ids.driver,
        vehicleType: 'VAN',
        system: 'ون وانا',
        modelYear: 1402,
        plateNumber: '12ب34567',
        capacity: 10,
        usageType: 'PERSONAL',
        ownershipType: 'SELF',
        insuranceExpiresAt: '2028-03-19', // 1406/12/29
        technicalInspectionExpiresAt: '2027-12-21', // 1406/09/30
      })
      .onConflictDoNothing();
    await db
      .insert(vehicles)
      .values([
        {
          id: ids.vehicle2,
          driverId: ids.driver2,
          vehicleType: 'MINIBUS',
          system: 'مینی‌بوس ایسوزو',
          modelYear: 1401,
          plateNumber: '45د67811',
          capacity: 16,
          usageType: 'PERSONAL',
          ownershipType: 'SELF',
          insuranceExpiresAt: '2028-05-20',
          technicalInspectionExpiresAt: '2027-11-21',
        },
        {
          id: ids.vehicle3,
          driverId: ids.driver3,
          vehicleType: 'CAR',
          system: 'سمند سورن',
          modelYear: 1403,
          plateNumber: '78ج90122',
          capacity: 4,
          usageType: 'TAXI',
          ownershipType: 'SELF',
          insuranceExpiresAt: '2028-08-21',
          technicalInspectionExpiresAt: '2028-02-19',
        },
      ])
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
          phoneNumber: '02122334455',
          managerName: 'مریم رضایی',
          managerPhone: SEED_CREDENTIALS.manager.phoneNumber,
          openingTime: '07:30',
          closingTime: '13:30',
          closingTimes: ['12:30', '13:30'],
          latitude: 35.7804,
          longitude: 51.3672,
          educationOptions: [
            { level: 'ابتدایی', grades: ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'] },
          ],
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
          phoneNumber: '02122556677',
          managerName: 'زهرا کریمی',
          managerPhone: '09127777777',
          openingTime: '07:30',
          closingTime: '14:00',
          closingTimes: ['13:00', '14:00'],
          latitude: 35.7892,
          longitude: 51.4591,
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
          phoneNumber: '02188776655',
          managerName: 'محمد اکبری',
          managerPhone: '09128888888',
          openingTime: '07:15',
          closingTime: '14:15',
          closingTimes: ['13:15', '14:15'],
          latitude: 35.7328,
          longitude: 51.4087,
          educationOptions: [
            { level: 'متوسطه اول', grades: ['هفتم', 'هشتم', 'نهم'] },
            { level: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] },
          ],
        },
        {
          id: ids.school4,
          name: 'هنرستان دانش نو',
          schoolType: 'PUBLIC',
          genderType: 'MIXED',
          province: 'تهران',
          city: 'تهران',
          district: '5',
          address: 'شهران، بلوار کوهسار',
          phoneNumber: '02144332211',
          managerName: 'لیلا نوری',
          managerPhone: SEED_CREDENTIALS.additionalManagers[2].phoneNumber,
          openingTime: '07:15',
          closingTime: '14:30',
          closingTimes: ['13:30', '14:30'],
          latitude: 35.7662,
          longitude: 51.2884,
          educationOptions: [{ level: 'متوسطه دوم', grades: ['دهم', 'یازدهم', 'دوازدهم'] }],
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(schoolManagerAssignments)
      .values([
        {
          id: ids.managerAssignment,
          managerUserId: ids.manager,
          schoolId: ids.school,
          isPrimary: true,
          status: 'ACTIVE',
        },
        {
          id: ids.managerAssignment2,
          managerUserId: ids.manager2,
          schoolId: ids.school2,
          isPrimary: true,
          status: 'ACTIVE',
        },
        {
          id: ids.managerAssignment3,
          managerUserId: ids.manager3,
          schoolId: ids.school3,
          isPrimary: true,
          status: 'ACTIVE',
        },
        {
          id: ids.managerAssignment4,
          managerUserId: ids.manager4,
          schoolId: ids.school4,
          isPrimary: true,
          status: 'ACTIVE',
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
          firstName: 'سارا',
          lastName: 'احمدی',
          nationalId: SEED_CREDENTIALS.parent.nationalId,
          phoneNumber: SEED_CREDENTIALS.parent.phoneNumber,
          isPrimaryContact: true,
          phoneVerifiedAt: new Date(),
        },
        {
          id: ids.father,
          userId: ids.user,
          parentType: 'FATHER',
          firstName: 'علی',
          lastName: 'احمدی',
          nationalId: SEED_CREDENTIALS.secondParent.nationalId,
          phoneNumber: SEED_CREDENTIALS.secondParent.phoneNumber,
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(parents)
      .values([
        {
          id: ids.family2Mother,
          userId: ids.family2,
          parentType: 'MOTHER',
          firstName: 'نرگس',
          lastName: 'صادقی',
          nationalId: SEED_CREDENTIALS.additionalParents[0].nationalId,
          phoneNumber: SEED_CREDENTIALS.additionalParents[0].phoneNumber,
          isPrimaryContact: true,
          phoneVerifiedAt: new Date('2026-07-15T08:00:00Z'),
        },
        {
          id: ids.family2Father,
          userId: ids.family2,
          parentType: 'FATHER',
          firstName: 'امیر',
          lastName: 'صادقی',
          nationalId: '0845760017',
          phoneNumber: '09122222223',
        },
        {
          id: ids.family3Mother,
          userId: ids.family3,
          parentType: 'MOTHER',
          firstName: 'مهسا',
          lastName: 'موسوی',
          nationalId: SEED_CREDENTIALS.additionalParents[1].nationalId,
          phoneNumber: SEED_CREDENTIALS.additionalParents[1].phoneNumber,
          isPrimaryContact: true,
          phoneVerifiedAt: new Date('2026-07-18T08:00:00Z'),
        },
      ])
      .onConflictDoNothing();
    await db
      .update(schools)
      .set({
        phoneNumber: '02122334455',
        managerName: 'مریم رضایی',
        managerPhone: SEED_CREDENTIALS.manager.phoneNumber,
        openingTime: '07:30',
        closingTime: '13:30',
        closingTimes: ['12:30', '13:30'],
        latitude: 35.7804,
        longitude: 51.3672,
      })
      .where(eq(schools.id, ids.school));
    await db
      .update(schools)
      .set({
        phoneNumber: '02122556677',
        managerName: 'زهرا کریمی',
        managerPhone: SEED_CREDENTIALS.additionalManagers[0].phoneNumber,
        openingTime: '07:30',
        closingTime: '14:00',
        closingTimes: ['13:00', '14:00'],
        latitude: 35.7892,
        longitude: 51.4591,
      })
      .where(eq(schools.id, ids.school2));
    await db
      .update(schools)
      .set({
        phoneNumber: '02188776655',
        managerName: 'محمد اکبری',
        managerPhone: SEED_CREDENTIALS.additionalManagers[1].phoneNumber,
        openingTime: '07:15',
        closingTime: '14:15',
        closingTimes: ['13:15', '14:15'],
        latitude: 35.7328,
        longitude: 51.4087,
      })
      .where(eq(schools.id, ids.school3));
    await db
      .update(parents)
      .set({
        firstName: 'سارا',
        lastName: 'احمدی',
        nationalId: SEED_CREDENTIALS.parent.nationalId,
        phoneNumber: SEED_CREDENTIALS.parent.phoneNumber,
      })
      .where(eq(parents.id, ids.mother));
    await db
      .update(parents)
      .set({
        firstName: 'علی',
        lastName: 'احمدی',
        nationalId: SEED_CREDENTIALS.secondParent.nationalId,
        phoneNumber: SEED_CREDENTIALS.secondParent.phoneNumber,
      })
      .where(eq(parents.id, ids.father));
    await db
      .insert(familyAddresses)
      .values({
        id: ids.address,
        userId: ids.user,
        title: 'منزل',
        province: 'تهران',
        city: 'تهران',
        district: '2',
        streetAddress: 'سعادت‌آباد، بلوار دریا، خیابان صراف‌ها',
        postalCode: '1234567890',
        latitude: 35.7781,
        longitude: 51.3655,
      })
      .onConflictDoNothing();
    await db
      .update(familyAddresses)
      .set({
        title: 'منزل',
        province: 'تهران',
        city: 'تهران',
        streetAddress: 'سعادت‌آباد، بلوار دریا، خیابان صراف‌ها',
        latitude: 35.7781,
        longitude: 51.3655,
      })
      .where(eq(familyAddresses.id, ids.address));
    await db
      .insert(familyAddresses)
      .values([
        {
          id: ids.family2Address,
          userId: ids.family2,
          title: 'منزل',
          province: 'تهران',
          city: 'تهران',
          district: '3',
          streetAddress: 'پاسداران، خیابان بوستان هفتم، پلاک ۲۱',
          postalCode: '1666688990',
          latitude: 35.7901,
          longitude: 51.4528,
        },
        {
          id: ids.family3Address,
          userId: ids.family3,
          title: 'منزل',
          province: 'تهران',
          city: 'تهران',
          district: '6',
          streetAddress: 'یوسف‌آباد، خیابان اسدآبادی، پلاک ۸۴',
          postalCode: '1433399001',
          latitude: 35.7314,
          longitude: 51.4102,
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(emergencyContacts)
      .values({
        id: ids.emergency,
        userId: ids.user,
        firstName: 'رضا',
        lastName: 'کریمی',
        relationship: 'UNCLE',
        phoneNumber: '09123333333',
      })
      .onConflictDoNothing();
    await db
      .update(emergencyContacts)
      .set({ firstName: 'رضا', lastName: 'کریمی' })
      .where(eq(emergencyContacts.id, ids.emergency));
    await db
      .insert(emergencyContacts)
      .values([
        {
          id: ids.family2Emergency,
          userId: ids.family2,
          firstName: 'پروانه',
          lastName: 'صادقی',
          relationship: 'AUNT',
          phoneNumber: '09123333334',
        },
        {
          id: ids.family3Emergency,
          userId: ids.family3,
          firstName: 'بهروز',
          lastName: 'موسوی',
          relationship: 'UNCLE',
          phoneNumber: '09123333335',
        },
      ])
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
          fatherName: 'علی',
          nationalId: '0084575972',
          birthDate: '2016-08-08', // 1395/05/18
          gender: 'FEMALE',
          grade: 'چهارم',
          className: 'چهارم الف',
          studentCode: '1405-1001',
        },
        {
          id: ids.student2,
          userId: ids.user,
          schoolId: ids.school2,
          firstName: 'هانا',
          lastName: 'احمدی',
          fatherName: 'علی',
          nationalId: '0084575980',
          birthDate: '2019-12-03', // 1398/09/12
          gender: 'FEMALE',
          grade: 'اول',
          className: 'اول ب',
          studentCode: '1405-1002',
        },
        {
          id: ids.student3,
          userId: ids.user,
          schoolId: ids.school3,
          firstName: 'آرین',
          lastName: 'احمدی',
          fatherName: 'علی',
          nationalId: '0084575999',
          birthDate: '2012-05-16', // 1391/02/27
          gender: 'MALE',
          grade: 'هشتم',
          className: 'هشتم یک',
          studentCode: '1405-1003',
        },
        {
          id: ids.student4,
          userId: ids.family2,
          schoolId: ids.school2,
          firstName: 'باران',
          lastName: 'صادقی',
          fatherName: 'امیر',
          nationalId: '0845760025',
          birthDate: '2016-01-27', // 1394/11/07
          gender: 'FEMALE',
          grade: 'پنجم',
          className: 'پنجم الف',
          studentCode: '1405-1004',
        },
        {
          id: ids.student5,
          userId: ids.family2,
          schoolId: ids.school2,
          firstName: 'یسنا',
          lastName: 'صادقی',
          fatherName: 'امیر',
          nationalId: '0845760033',
          birthDate: '2018-06-12', // 1397/03/22
          gender: 'FEMALE',
          grade: 'دوم',
          className: 'دوم ب',
          studentCode: '1405-1005',
        },
        {
          id: ids.student6,
          userId: ids.family3,
          schoolId: ids.school3,
          firstName: 'پارسا',
          lastName: 'موسوی',
          fatherName: 'سعید',
          nationalId: '0845760051',
          birthDate: '2013-10-02', // 1392/07/10
          gender: 'MALE',
          grade: 'هفتم',
          className: 'هفتم دو',
          studentCode: '1405-1006',
        },
        {
          id: ids.student7,
          userId: ids.family3,
          schoolId: ids.school4,
          firstName: 'کیان',
          lastName: 'موسوی',
          fatherName: 'سعید',
          nationalId: '0845760068',
          birthDate: '2011-01-05', // 1389/10/15
          gender: 'MALE',
          grade: 'دهم',
          className: 'دهم شبکه',
          fieldOfStudy: 'شبکه و نرم‌افزار رایانه',
          studentCode: '1405-1007',
        },
      ])
      .onConflictDoNothing();
    await db
      .update(students)
      .set({
        fatherName: 'علی',
        nationalId: '0084575972',
        birthDate: '2016-08-08',
        gender: 'FEMALE',
        grade: 'چهارم',
        className: 'چهارم الف',
        studentCode: '1405-1001',
      })
      .where(eq(students.id, ids.student));
    await db
      .update(students)
      .set({
        fatherName: 'علی',
        nationalId: '0084575980',
        birthDate: '2019-12-03',
        gender: 'FEMALE',
        grade: 'اول',
        className: 'اول ب',
        studentCode: '1405-1002',
      })
      .where(eq(students.id, ids.student2));
    await db
      .update(students)
      .set({
        fatherName: 'علی',
        nationalId: '0084575999',
        birthDate: '2012-05-16',
        gender: 'MALE',
        grade: 'هشتم',
        className: 'هشتم یک',
        studentCode: '1405-1003',
      })
      .where(eq(students.id, ids.student3));
    await db
      .insert(transportServiceRuns)
      .values([
        {
          id: ids.routeToSchool,
          schoolId: ids.school,
          driverId: ids.driver,
          vehicleId: ids.vehicle,
          academicYear: '1405-1406',
          title: 'مسیر رفت سعادت‌آباد',
          direction: 'TO_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '07:00',
          scheduledArrivalTime: '07:30',
          areaDescription: 'سعادت‌آباد تا دبستان اندیشه روشن',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
        {
          id: ids.routeFromSchool,
          schoolId: ids.school,
          driverId: ids.driver,
          vehicleId: ids.vehicle,
          academicYear: '1405-1406',
          title: 'مسیر برگشت سعادت‌آباد',
          direction: 'FROM_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '13:30',
          scheduledArrivalTime: '14:00',
          areaDescription: 'دبستان اندیشه روشن تا سعادت‌آباد',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
        {
          id: ids.routeSchool2To,
          schoolId: ids.school2,
          driverId: ids.driver2,
          vehicleId: ids.vehicle2,
          academicYear: '1405-1406',
          title: 'مسیر رفت پاسداران',
          direction: 'TO_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '06:50',
          scheduledArrivalTime: '07:25',
          areaDescription: 'پاسداران و هروی تا مجتمع آموزشی مهرآیین',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
        {
          id: ids.routeSchool2From,
          schoolId: ids.school2,
          driverId: ids.driver2,
          vehicleId: ids.vehicle2,
          academicYear: '1405-1406',
          title: 'مسیر برگشت پاسداران',
          direction: 'FROM_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '14:00',
          scheduledArrivalTime: '14:40',
          areaDescription: 'مجتمع آموزشی مهرآیین تا پاسداران و هروی',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
        {
          id: ids.routeSchool3To,
          schoolId: ids.school3,
          driverId: ids.driver3,
          vehicleId: ids.vehicle3,
          academicYear: '1405-1406',
          title: 'مسیر رفت یوسف‌آباد',
          direction: 'TO_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '06:55',
          scheduledArrivalTime: '07:10',
          areaDescription: 'یوسف‌آباد تا دبیرستان فرهنگ',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
        {
          id: ids.routeSchool3From,
          schoolId: ids.school3,
          driverId: ids.driver3,
          vehicleId: ids.vehicle3,
          academicYear: '1405-1406',
          title: 'مسیر برگشت یوسف‌آباد',
          direction: 'FROM_SCHOOL',
          sequenceNumber: 1,
          scheduledStartTime: '14:15',
          scheduledArrivalTime: '14:35',
          areaDescription: 'دبیرستان فرهنگ تا یوسف‌آباد',
          activeWeekdays: [0, 1, 2, 3, 4],
        },
      ])
      .onConflictDoNothing();
    await seedRouteAssignments(db, [
      {
        id: ids.routeMemberToSchool,
        serviceRunId: ids.routeToSchool,
        studentId: ids.student,
        pickupOrder: 1,
        scheduledStopTime: '07:10',
        notes: 'پنج دقیقه پیش از رسیدن تماس گرفته شود.',
      },
      {
        id: ids.routeMemberFromSchool,
        serviceRunId: ids.routeFromSchool,
        studentId: ids.student,
        pickupOrder: 1,
        scheduledStopTime: '13:50',
      },
      {
        id: ids.routeMember4To,
        serviceRunId: ids.routeSchool2To,
        studentId: ids.student4,
        pickupOrder: 1,
        scheduledStopTime: '07:00',
      },
      {
        id: ids.routeMember5To,
        serviceRunId: ids.routeSchool2To,
        studentId: ids.student5,
        pickupOrder: 2,
        scheduledStopTime: '07:08',
        notes: 'دانش‌آموزان یک خانواده هستند.',
      },
      {
        id: ids.routeMember4From,
        serviceRunId: ids.routeSchool2From,
        studentId: ids.student4,
        pickupOrder: 1,
        scheduledStopTime: '14:18',
      },
      {
        id: ids.routeMember5From,
        serviceRunId: ids.routeSchool2From,
        studentId: ids.student5,
        pickupOrder: 2,
        scheduledStopTime: '14:20',
      },
      {
        id: ids.routeMember6To,
        serviceRunId: ids.routeSchool3To,
        studentId: ids.student6,
        pickupOrder: 1,
        scheduledStopTime: '07:02',
      },
      {
        id: ids.routeMember6From,
        serviceRunId: ids.routeSchool3From,
        studentId: ids.student6,
        pickupOrder: 1,
        scheduledStopTime: '14:25',
      },
    ]);
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
        {
          id: ids.registration3,
          studentId: ids.student4,
          academicYear: '1405-1406',
          serviceType: 'ROUND_TRIP',
          selectedAddressId: ids.family2Address,
          requestedStartDate: new Date('2026-09-23T04:30:00Z'),
          registrationStatus: 'ENROLLED',
          submittedAt: new Date('2026-07-12T08:00:00Z'),
          reviewedAt: new Date('2026-07-14T08:00:00Z'),
          reviewedByAdminId: ids.admin,
        },
        {
          id: ids.registration4,
          studentId: ids.student5,
          academicYear: '1405-1406',
          serviceType: 'ROUND_TRIP',
          selectedAddressId: ids.family2Address,
          requestedStartDate: new Date('2026-09-23T04:30:00Z'),
          registrationStatus: 'CONTRACT_ACCEPTED',
          submittedAt: new Date('2026-07-13T08:00:00Z'),
          reviewedAt: new Date('2026-07-15T08:00:00Z'),
          reviewedByAdminId: ids.admin,
        },
        {
          id: ids.registration5,
          studentId: ids.student6,
          academicYear: '1405-1406',
          serviceType: 'ROUND_TRIP',
          selectedAddressId: ids.family3Address,
          requestedStartDate: new Date('2026-09-23T04:30:00Z'),
          registrationStatus: 'ENROLLED',
          submittedAt: new Date('2026-07-16T08:00:00Z'),
          reviewedAt: new Date('2026-07-18T08:00:00Z'),
          reviewedByAdminId: ids.admin,
        },
        {
          id: ids.registration6,
          studentId: ids.student7,
          academicYear: '1405-1406',
          serviceType: 'ONE_WAY',
          selectedAddressId: ids.family3Address,
          requestedStartDate: new Date('2026-09-23T04:30:00Z'),
          registrationStatus: 'UNDER_REVIEW',
          submittedAt: new Date('2026-07-22T08:00:00Z'),
          parentNotes: 'سرویس فقط برای مسیر برگشت مورد نیاز است.',
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
        prepaymentAmount: 49_978_000,
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
        prepaymentAmount: 49_978_000,
        remainingInstallmentAmount: 80_000_000,
        installmentCount: 4,
        planStatus: 'ACTIVE',
        activatedAt: new Date('2026-07-06T08:00:00Z'),
      })
      .onConflictDoNothing();
    await db
      .insert(paymentScheduleItems)
      .values([
        {
          id: ids.prepayment,
          paymentPlanId: ids.plan,
          itemType: 'PREPAYMENT',
          sequenceNumber: 0,
          amount: 49_978_000,
          dueDate: new Date('2026-07-10T08:00:00Z'),
          itemStatus: 'PAID',
          paidAmount: 49_978_000,
          paidAt: new Date('2026-07-08T08:00:00Z'),
        },
        {
          id: ids.installment1,
          paymentPlanId: ids.plan,
          itemType: 'INSTALLMENT',
          sequenceNumber: 1,
          amount: 20_000_000,
          dueDate: new Date('2026-09-23T08:00:00Z'),
        },
        {
          id: ids.installment2,
          paymentPlanId: ids.plan,
          itemType: 'INSTALLMENT',
          sequenceNumber: 2,
          amount: 20_000_000,
          dueDate: new Date('2026-10-23T08:00:00Z'),
        },
        {
          id: ids.installment3,
          paymentPlanId: ids.plan,
          itemType: 'INSTALLMENT',
          sequenceNumber: 3,
          amount: 20_000_000,
          dueDate: new Date('2026-11-22T08:00:00Z'),
        },
        {
          id: ids.installment4,
          paymentPlanId: ids.plan,
          itemType: 'INSTALLMENT',
          sequenceNumber: 4,
          amount: 20_000_000,
          dueDate: new Date('2026-12-22T08:00:00Z'),
        },
      ])
      .onConflictDoNothing();
    await db
      .insert(paymentTransactions)
      .values({
        id: ids.transaction,
        paymentPlanId: ids.plan,
        paymentScheduleItemId: ids.prepayment,
        userId: ids.user,
        amount: 49_978_000,
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
        contractDataSnapshot: JSON.stringify({
          academicYear: '1405-1406',
          serviceType: 'ROUND_TRIP',
          totalAmount: 120_000_000,
        }),
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
