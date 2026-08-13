import { migrateDatabase } from './migrate';
import { seedDatabase } from './seed';

export async function bootstrapDatabase(
  environment = process.env,
  migrate = migrateDatabase,
  seed = seedDatabase,
) {
  await migrate(environment.DATABASE_URL);
  const seedRequested = environment.SEED_DEMO_DATA === 'true';
  if (
    seedRequested &&
    environment.NODE_ENV === 'production' &&
    environment.DEPLOYMENT_PROFILE !== 'preview'
  ) {
    throw new Error('Demo seeding is forbidden in production.');
  }
  if (seedRequested) {
    await seed(environment.DATABASE_URL);
    console.log('Database migrated and explicitly requested demo data seeded.');
  } else {
    console.log('Database migrations applied; demo seeding disabled.');
  }
}

if (require.main === module) {
  bootstrapDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
