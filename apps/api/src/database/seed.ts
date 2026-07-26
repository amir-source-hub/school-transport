import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  adminUsers,
  emergencyContacts,
  familyAddresses,
  parents,
  schools,
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
      .values({
        id: ids.school,
        name: 'مدرسه نمونه تهران',
        schoolType: 'PUBLIC',
        genderType: 'MIXED',
        province: 'Tehran',
        city: 'Tehran',
        district: '2',
        address: 'Demo school address',
      })
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
      .values({
        id: ids.student,
        userId: ids.user,
        schoolId: ids.school,
        firstName: 'Nika',
        lastName: 'Ahmadi',
        nationalId: '0023546789',
        grade: '4',
      })
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
