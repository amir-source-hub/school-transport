import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = import.meta.dirname;
const root = resolve(directory, '../..');
const dashboard = JSON.parse(await readFile(resolve(directory, 'platform-dashboard.json'), 'utf8'));
const inventory = JSON.parse(
  await readFile(resolve(directory, 'monitoring-inventory.json'), 'utf8'),
);
const contract = await readFile(resolve(directory, 'MONITORING_CONTRACT.md'), 'utf8');
const alerts = `${await readFile(resolve(directory, 'platform-alerts.yml'), 'utf8')}\n${await readFile(resolve(directory, 'messaging-alerts.yml'), 'utf8')}`;
const slos = await readFile(resolve(directory, 'SLOS.md'), 'utf8');
const runbook = await readFile(resolve(directory, 'INCIDENT_RUNBOOK.md'), 'utf8');
const prometheus = await readFile(resolve(directory, 'prometheus.yml'), 'utf8');
const recordingRules = await readFile(resolve(directory, 'recording-rules.yml'), 'utf8');
const prometheusAlerts = await readFile(resolve(directory, 'prometheus-alerts.yml'), 'utf8');
const exporterAlerts = await readFile(resolve(directory, 'exporter-alerts.yml'), 'utf8');
const alertmanagerAlerts = await readFile(resolve(directory, 'alertmanager-alerts.yml'), 'utf8');
const loggingAlerts = await readFile(resolve(directory, 'logging-alerts.yml'), 'utf8');
const alertmanager = await readFile(resolve(directory, 'alertmanager.yml'), 'utf8');
const blackbox = await readFile(resolve(directory, 'blackbox.yml'), 'utf8');
const grafanaDatasource = await readFile(
  resolve(directory, 'grafana/provisioning/datasources/prometheus.yml'),
  'utf8',
);
const grafanaProvider = await readFile(
  resolve(directory, 'grafana/provisioning/dashboards/dashboards.yml'),
  'utf8',
);
const grafanaDashboard = JSON.parse(
  await readFile(resolve(directory, 'grafana/dashboards/platform-overview.json'), 'utf8'),
);
const lokiDatasource = await readFile(
  resolve(directory, 'grafana/provisioning/datasources/loki.yml'),
  'utf8',
);
const logsDashboard = JSON.parse(
  await readFile(resolve(directory, 'grafana/dashboards/logs-overview.json'), 'utf8'),
);
const loki = await readFile(resolve(directory, 'loki.yml'), 'utf8');
const alloy = await readFile(resolve(directory, 'alloy/config.alloy'), 'utf8');
const monitoringCompose = await readFile(resolve(root, 'docker-compose.monitoring.yml'), 'utf8');
const allAlertRules = [
  alerts,
  prometheusAlerts,
  exporterAlerts,
  alertmanagerAlerts,
  loggingAlerts,
].join('\n');
const monitoringEnvironmentExample = await readFile(
  resolve(directory, '.env.monitoring.example'),
  'utf8',
);
const preflight = await readFile(resolve(directory, 'validate-monitoring.sh'), 'utf8');
const smokeTest = await readFile(resolve(directory, 'smoke-monitoring.mjs'), 'utf8');
const secretValidation = await readFile(
  resolve(directory, 'validate-monitoring-secrets.mjs'),
  'utf8',
);
const metrics = [
  'school_transport_http_requests_total',
  'school_transport_http_duration_seconds_bucket',
  'school_transport_database_pool_connections',
  'school_transport_database_readiness_total',
  'school_transport_queue_jobs_total',
  'school_transport_notification_queue_oldest_age_seconds',
  'school_transport_message_outcomes_total',
  'school_transport_backup_last_success_timestamp_seconds',
  'school_transport_backup_last_run_success',
  'school_transport_restore_validation_last_success_timestamp_seconds',
  'school_transport_restore_validation_last_run_success',
];
if (inventory.metricPrefix !== 'school_transport_') {
  throw new Error('Monitoring inventory must retain the project metric prefix.');
}
if (!Array.isArray(inventory.services) || inventory.services.length < 10) {
  throw new Error('Monitoring inventory must cover every service and operational dependency.');
}
for (const service of inventory.services) {
  if (!service.name || !inventory.owners.includes(service.owner)) {
    throw new Error(`Monitoring inventory has an invalid owner for ${service.name ?? 'unknown'}.`);
  }
  if (!['implemented', 'partial', 'planned'].includes(service.state)) {
    throw new Error(`Monitoring inventory has an invalid state for ${service.name}.`);
  }
  if (!Array.isArray(service.signals) || service.signals.length === 0) {
    throw new Error(`Monitoring inventory has no signals for ${service.name}.`);
  }
}
for (const metric of inventory.implementedMetrics) {
  if (!metric.startsWith(inventory.metricPrefix)) {
    throw new Error(`Metric does not use the project prefix: ${metric}.`);
  }
}
for (const prefix of ['node_', 'container_', 'pg_', 'redis_', 'probe_']) {
  if (!inventory.exporterMetricFamilies?.includes(prefix)) {
    throw new Error(`Monitoring inventory is missing exporter metric family ${prefix}.`);
  }
}
for (const required of [
  'Sensitive-data boundary',
  'Alert contract',
  'Verification and acceptance',
]) {
  if (!contract.includes(required)) throw new Error(`Monitoring contract is missing ${required}.`);
}
for (const alertRule of allAlertRules.split(/\n\s+- alert: /).slice(1)) {
  const alertName = alertRule.split('\n', 1)[0];
  for (const required of ['severity:', 'service:', 'owner:', 'summary:', 'impact:', 'runbook:']) {
    if (!alertRule.includes(required)) {
      throw new Error(`Alert ${alertName} is missing operational metadata ${required}.`);
    }
  }
}
for (const required of [
  'METRICS_BEARER_TOKEN_FILE: 32',
  'metadata.mode & 0o077',
  "webhook.protocol !== 'https:'",
  "redisPasswordMap?.['redis://redis:6379']",
]) {
  if (!secretValidation.includes(required)) {
    throw new Error(`Monitoring secret validation is missing ${required}.`);
  }
}
for (const required of [
  'credentials_file: /run/secrets/metrics_bearer_token',
  "targets: ['api:5000']",
  'recording-rules.yml',
  'prometheus-alerts.yml',
  'exporter-alerts.yml',
  'alertmanager-alerts.yml',
  'logging-alerts.yml',
  "targets: ['alertmanager:9093']",
  "targets: ['loki:3100']",
  "targets: ['alloy:12345']",
  "targets: ['node-exporter:9100']",
  "targets: ['cadvisor:8080']",
  "targets: ['postgres-exporter:9187']",
  "targets: ['redis-exporter:9121']",
  'replacement: blackbox-exporter:9115',
]) {
  if (!prometheus.includes(required)) {
    throw new Error(`Prometheus configuration is missing ${required}.`);
  }
}
if (!loggingAlerts.includes('LokiDiscardingSamples')) {
  throw new Error('Logging pipeline alerts must detect discarded Loki samples.');
}
for (const required of [
  'PrometheusCannotReachAlertmanager',
  'AlertmanagerNotificationFailures',
  'AlertmanagerConfigurationReloadFailed',
  'AlertmanagerNotificationLatencyHigh',
]) {
  if (!alertmanagerAlerts.includes(required)) {
    throw new Error(`Alert delivery monitoring is missing ${required}.`);
  }
}
for (const required of [
  'receiver: platform-critical',
  'matchers: [\'severity="critical"\']',
  'url_file: /run/secrets/alert_webhook_url',
  'send_resolved: true',
  'inhibit_rules:',
]) {
  if (!alertmanager.includes(required)) {
    throw new Error(`Alertmanager routing is missing ${required}.`);
  }
}
for (const required of [
  'HostFilesystemSpaceCritical',
  'NodeTextfileCollectorError',
  'PostgreSQLExporterCannotConnect',
  'RedisExporterCannotConnect',
  'BlackboxProbeFailed',
  'PublicTlsCertificateExpiring',
]) {
  if (!exporterAlerts.includes(required)) {
    throw new Error(`Exporter alerts are missing ${required}.`);
  }
}
if (
  !blackbox.includes('preferred_ip_protocol: ip4') ||
  !blackbox.includes('follow_redirects: true')
) {
  throw new Error('Blackbox HTTP probing must have deterministic IP and redirect behavior.');
}
for (const required of [
  'school_transport:http_error_ratio:5m',
  'school_transport:http_latency_p95_seconds:10m',
  'school_transport:worker_heartbeat_age_seconds',
  'school_transport:backup_age_seconds',
]) {
  if (!recordingRules.includes(required)) {
    throw new Error(`Prometheus recording rules are missing ${required}.`);
  }
}
for (const required of [
  'PrometheusTargetDown',
  'PrometheusApiTargetMissing',
  'PrometheusRuleEvaluationFailures',
  'PrometheusConfigurationReloadFailed',
]) {
  if (!prometheusAlerts.includes(required)) {
    throw new Error(`Prometheus self-monitoring is missing ${required}.`);
  }
}
if (
  !monitoringCompose.includes('prom/prometheus:v3.14.0-distroless@sha256:') ||
  !monitoringCompose.includes("user: '65532:65532'") ||
  !monitoringCompose.includes('127.0.0.1:${PROMETHEUS_HOST_PORT:-9090}:9090')
) {
  throw new Error('Prometheus container must remain digest-pinned, non-root, and loopback-only.');
}
for (const required of [
  'prom/node-exporter:v1.12.1-distroless@sha256:',
  'ghcr.io/google/cadvisor:0.60.5@sha256:',
  'prometheuscommunity/postgres-exporter:v0.20.1@sha256:',
  'oliver006/redis_exporter:v1.90.0-alpine@sha256:',
  'prom/blackbox-exporter:v0.28.0@sha256:',
  '/var/lib/node_exporter/textfile_collector:/textfile:ro',
  'DATA_SOURCE_PASS_FILE: /run/secrets/postgres_exporter_password',
  'REDIS_PASSWORD_FILE: /run/secrets/redis_exporter_password_map',
  'grafana/grafana:13.1.0@sha256:',
  'GF_SECURITY_ADMIN_PASSWORD__FILE: /run/secrets/grafana_admin_password',
  '127.0.0.1:${GRAFANA_HOST_PORT:-3001}:3000',
  'file: ${METRICS_BEARER_TOKEN_FILE:',
  'prom/alertmanager:v0.34.1@sha256:',
  '127.0.0.1:${ALERTMANAGER_HOST_PORT:-9093}:9093',
  'file: ${ALERT_WEBHOOK_URL_FILE:',
  'grafana/loki:3.7.0@sha256:',
  'grafana/alloy:v1.20.1@sha256:',
  '/var/run/docker.sock:/var/run/docker.sock:ro',
]) {
  if (!monitoringCompose.includes(required)) {
    throw new Error(`Monitoring Compose is missing exporter control: ${required}.`);
  }
}
for (const required of ['uid: loki', 'url: http://loki:3100', 'editable: false']) {
  if (!lokiDatasource.includes(required)) {
    throw new Error(`Grafana Loki datasource provisioning is missing ${required}.`);
  }
}
if (logsDashboard.uid !== 'school-transport-logs' || logsDashboard.panels.length < 3) {
  throw new Error('Grafana logs dashboard must retain its stable UID and operational panels.');
}
for (const required of [
  'retention_period: 720h',
  'reject_old_samples_max_age: 168h',
  'reporting_enabled: false',
]) {
  if (!loki.includes(required)) throw new Error(`Loki configuration is missing ${required}.`);
}
for (const required of [
  'discovery.docker "school_transport"',
  'regex         = "school[-_]transport.*"',
  'loki.source.docker "school_transport"',
  'url = "http://loki:3100/loki/api/v1/push"',
]) {
  if (!alloy.includes(required)) throw new Error(`Alloy configuration is missing ${required}.`);
}
for (const required of [
  'uid: prometheus',
  'url: http://prometheus:9090',
  'isDefault: true',
  'editable: false',
]) {
  if (!grafanaDatasource.includes(required)) {
    throw new Error(`Grafana datasource provisioning is missing ${required}.`);
  }
}
for (const required of ['disableDeletion: true', 'allowUiUpdates: false']) {
  if (!grafanaProvider.includes(required)) {
    throw new Error(`Grafana dashboard provisioning is missing ${required}.`);
  }
}
if (grafanaDashboard.uid !== 'school-transport-operations' || grafanaDashboard.panels.length < 15) {
  throw new Error(
    'Grafana operations dashboard must retain its stable UID and full panel coverage.',
  );
}
for (const metric of [
  'probe_success',
  'school_transport:http_error_ratio:5m',
  'node_cpu_seconds_total',
  'container_memory_working_set_bytes',
  'pg_stat_database_numbackends',
  'redis_memory_used_bytes',
  'school_transport:backup_age_seconds',
  'school_transport:restore_validation_age_seconds',
  'school_transport_backup_remote_verification_success',
  'school_transport_backup_retention_last_success_timestamp_seconds',
]) {
  if (!JSON.stringify(grafanaDashboard).includes(metric)) {
    throw new Error(`Grafana dashboard is missing operational metric ${metric}.`);
  }
}
for (const required of [
  'METRICS_BEARER_TOKEN_FILE=',
  'APPLICATION_BACKEND_NETWORK=',
  'POSTGRES_EXPORTER_PASSWORD_FILE=',
  'REDIS_EXPORTER_PASSWORD_MAP_FILE=',
  'GRAFANA_ADMIN_PASSWORD_FILE=',
  'ALERT_WEBHOOK_URL_FILE=',
]) {
  if (!monitoringEnvironmentExample.includes(required)) {
    throw new Error(`Monitoring environment example is missing ${required}.`);
  }
}
for (const forbidden of ['GRAFANA_ADMIN_PASSWORD_FILE=', 'ALERT_WEBHOOK_URL_FILE=']) {
  const rootEnvironment = await readFile(resolve(root, '.env.example'), 'utf8');
  if (rootEnvironment.includes(forbidden)) {
    throw new Error(`Root application environment must not contain ${forbidden}.`);
  }
}
for (const metric of metrics) {
  const represented = JSON.stringify(dashboard).includes(metric) || alerts.includes(metric);
  if (!represented) throw new Error(`Monitoring coverage is missing ${metric}.`);
}
for (const required of [
  'promtool',
  'amtool',
  '--enable-feature=utf8-strict-mode',
  '-verify-config',
  'alloy',
  'validate /etc/alloy/config.alloy',
]) {
  if (!preflight.includes(required)) {
    throw new Error(`Monitoring preflight is missing ${required}.`);
  }
}
for (const required of [
  "'school-transport-api'",
  "'alertmanager'",
  "'loki'",
  "'alloy'",
  'probe_success{job="blackbox-http"}',
  'prometheus_notifications_alertmanagers_discovered',
  "process.argv.includes('--send-test-alert')",
]) {
  if (!smokeTest.includes(required)) {
    throw new Error(`Monitoring smoke test is missing ${required}.`);
  }
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
  'Monitoring assets cover metrics, logs, visualization, alert delivery, HTTP, database, queue, provider, backlog, ownership, and response.\n',
);
