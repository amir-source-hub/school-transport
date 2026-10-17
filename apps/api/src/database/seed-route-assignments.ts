import { asc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { students, transportServiceRuns, transportServiceRunStudents, vehicles } from './schemas';

type Membership = typeof transportServiceRunStudents.$inferInsert;

// Seed only untouched students. Historical memberships also count: a removed or
// reassigned demo service must never be restored by running bootstrap again.
export async function seedRouteAssignments(db: NodePgDatabase, memberships: Membership[]) {
  const pairs = new Map<string, Membership[]>();
  for (const member of memberships) {
    pairs.set(member.studentId, [...(pairs.get(member.studentId) ?? []), member]);
  }
  for (const [studentId, pair] of pairs) {
    await db.transaction(async (txn) => {
      const [student] = await txn
        .select()
        .from(students)
        .where(eq(students.id, studentId))
        .for('update');
      if (!student?.isActive) return;
      const history = await txn
        .select({ id: transportServiceRunStudents.id })
        .from(transportServiceRunStudents)
        .where(eq(transportServiceRunStudents.studentId, studentId))
        .limit(1);
      if (history.length) return;
      const routes = await txn
        .select()
        .from(transportServiceRuns)
        .where(
          inArray(
            transportServiceRuns.id,
            pair.map((m) => m.serviceRunId),
          ),
        )
        .orderBy(asc(transportServiceRuns.id))
        .for('update');
      if (
        pair.length !== 2 ||
        routes.length !== 2 ||
        new Set(routes.map((r) => r.direction)).size !== 2 ||
        new Set(routes.map((r) => r.driverId)).size !== 1 ||
        new Set(routes.map((r) => r.academicYear)).size !== 1 ||
        routes.some((r) => !r.isActive || r.schoolId !== student.schoolId)
      )
        return;
      const cars = await txn
        .select()
        .from(vehicles)
        .where(
          inArray(
            vehicles.id,
            routes.map((r) => r.vehicleId),
          ),
        )
        .orderBy(asc(vehicles.id))
        .for('update');
      for (const route of routes) {
        const car = cars.find((v) => v.id === route.vehicleId);
        const members = await txn
          .select()
          .from(transportServiceRunStudents)
          .where(eq(transportServiceRunStudents.serviceRunId, route.id));
        const proposed = pair.find((m) => m.serviceRunId === route.id)!;
        if (
          !car ||
          car.status !== 'ACTIVE' ||
          members.filter((m) => m.isActive).length >= car.capacity ||
          members.some((m) => m.pickupOrder === proposed.pickupOrder)
        )
          return;
      }
      // Both directions are inserted together; a failure rolls back the whole pair.
      await txn.insert(transportServiceRunStudents).values(pair);
    });
  }
}
