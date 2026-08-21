import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const httpActivityLogs = pgTable(
  'http_activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requestId: varchar('request_id', { length: 128 }).notNull(),
    traceId: varchar('trace_id', { length: 32 }).notNull(),
    actorType: varchar('actor_type', { length: 20 }),
    actorId: uuid('actor_id'),
    method: varchar('method', { length: 10 }).notNull(),
    route: varchar('route', { length: 255 }).notNull(),
    statusCode: integer('status_code').notNull(),
    durationMs: integer('duration_ms').notNull(),
    outcome: varchar('outcome', { length: 20 }).notNull(),
    errorCode: varchar('error_code', { length: 100 }),
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    requestIdIdx: index('idx_http_activity_request_id').on(table.requestId),
    traceIdIdx: index('idx_http_activity_trace_id').on(table.traceId),
    actorCreatedIdx: index('idx_http_activity_actor_created').on(table.actorId, table.createdAt),
    routeCreatedIdx: index('idx_http_activity_route_created').on(table.route, table.createdAt),
    outcomeCreatedIdx: index('idx_http_activity_outcome_created').on(
      table.outcome,
      table.createdAt,
    ),
    createdAtIdx: index('idx_http_activity_created_at').on(table.createdAt),
  }),
);
