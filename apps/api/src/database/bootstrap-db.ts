import { migrateDatabase } from './migrate';
import { seedDatabase } from './seed';

async function bootstrapDatabase() {
  await migrateDatabase();
  await seedDatabase();
  console.log('Database migrated and seeded.');
}

bootstrapDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
