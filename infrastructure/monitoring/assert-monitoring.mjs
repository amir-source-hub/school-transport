import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = import.meta.dirname;
const dashboard = JSON.parse(await readFile(resolve(directory, 'platform-dashboard.json'), 'utf8'));
const alerts = `${await readFile(resolve(directory, 'platform-alerts.yml'), 'utf8')}\n${await readFile(resolve(directory, 'messaging-alerts.yml'), 'utf8')}`;
const slos = await readFile(resolve(directory, 'SLOS.md'), 'utf8');
const runbook = await readFile(resolve(directory, 'INCIDENT_RUNBOOK.md'), 'utf8');
const metrics = [
  'school_transport_http_requests_total',
  'school_transport_http_duration_seconds_bucket',
  'school_transport_database_pool_connections',
  'school_transport_database_readiness_total',
  'school_transport_queue_jobs_total',
  'school_transport_notification_queue_oldest_age_seconds',
  'school_transport_message_outcomes_total',
];
for (const metric of metrics) {
  const represented = JSON.stringify(dashboard).includes(metric) || alerts.includes(metric);
  if (!represented) throw new Error(`Monitoring coverage is missing ${metric}.`);
}
for (const section of ['Owner:', 'Error-budget policy', 'API latency', 'PostgreSQL readiness']) {
  if (!slos.includes(section)) throw new Error(`SLO document is missing ${section}.`);
}
for (const section of [
  'Owner:',
  'Contain:',
  'Recover queues',
  'payment ambiguity',
  'privacy/security',
]) {
  if (!runbook.includes(section)) throw new Error(`Incident runbook is missing ${section}.`);
}
if (!Array.isArray(dashboard.panels) || dashboard.panels.length < 6) {
  throw new Error('Platform dashboard must retain all critical signal panels.');
}
process.stdout.write(
  'Monitoring assets cover HTTP, database, queue, provider, backlog, ownership, and response.\n',
);
