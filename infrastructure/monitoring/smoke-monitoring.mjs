const prometheusUrl = process.env.PROMETHEUS_SMOKE_URL ?? 'http://127.0.0.1:9090';
const alertmanagerUrl = process.env.ALERTMANAGER_SMOKE_URL ?? 'http://127.0.0.1:9093';
const grafanaUrl = process.env.GRAFANA_SMOKE_URL ?? 'http://127.0.0.1:3001';
const expectedJobs = [
  'prometheus',
  'school-transport-api',
  'alertmanager',
  'node-exporter',
  'cadvisor',
  'postgres-exporter',
  'redis-exporter',
  'blackbox-http',
  'loki',
  'alloy',
];

const fetchChecked = async (url, options = {}) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response;
};

const prometheusQuery = async (query) => {
  const url = new URL('/api/v1/query', prometheusUrl);
  url.searchParams.set('query', query);
  const payload = await (await fetchChecked(url)).json();
  if (payload.status !== 'success') throw new Error(`Prometheus query failed: ${query}`);
  return payload.data.result;
};

const targetsPayload = await (
  await fetchChecked(new URL('/api/v1/targets?state=active', prometheusUrl))
).json();
const targets = targetsPayload.data?.activeTargets ?? [];
for (const job of expectedJobs) {
  const jobTargets = targets.filter((target) => target.labels?.job === job);
  if (jobTargets.length === 0) throw new Error(`Prometheus has no active target for ${job}.`);
  const unhealthy = jobTargets.filter((target) => target.health !== 'up');
  if (unhealthy.length > 0) throw new Error(`${job} has ${unhealthy.length} unhealthy target(s).`);
}

const rulePayload = await (await fetchChecked(new URL('/api/v1/rules', prometheusUrl))).json();
if (rulePayload.status !== 'success' || (rulePayload.data?.groups ?? []).length === 0) {
  throw new Error('Prometheus has no loaded rule groups.');
}
const ruleErrors = (rulePayload.data?.groups ?? []).filter((group) => group.lastError);
if (ruleErrors.length > 0)
  throw new Error(`${ruleErrors.length} Prometheus rule group(s) have errors.`);

const probes = await prometheusQuery('probe_success{job="blackbox-http"}');
if (probes.length < 2 || probes.some((sample) => Number(sample.value?.[1]) !== 1)) {
  throw new Error('One or more black-box probes are missing or unsuccessful.');
}
const discovered = await prometheusQuery('prometheus_notifications_alertmanagers_discovered');
if (discovered.length === 0 || discovered.some((sample) => Number(sample.value?.[1]) < 1)) {
  throw new Error('Prometheus has not discovered Alertmanager.');
}

await fetchChecked(new URL('/-/healthy', alertmanagerUrl));
await fetchChecked(new URL('/api/health', grafanaUrl));

const adminPassword = process.env.GRAFANA_ADMIN_PASSWORD;
if (!adminPassword) throw new Error('GRAFANA_ADMIN_PASSWORD is required for smoke tests.');
const adminUser = process.env.GRAFANA_ADMIN_USER ?? 'admin';
const authorization = `Basic ${Buffer.from(`${adminUser}:${adminPassword}`).toString('base64')}`;
for (const uid of ['prometheus', 'loki']) {
  await fetchChecked(new URL(`/api/datasources/uid/${uid}`, grafanaUrl), {
    headers: { authorization },
  });
}
for (const uid of ['school-transport-operations', 'school-transport-logs']) {
  await fetchChecked(new URL(`/api/dashboards/uid/${uid}`, grafanaUrl), {
    headers: { authorization },
  });
}

if (process.argv.includes('--send-test-alert')) {
  const now = Date.now();
  await fetchChecked(new URL('/api/v2/alerts', alertmanagerUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify([
      {
        labels: {
          alertname: 'MonitoringDeliverySmokeTest',
          environment: process.env.DEPLOY_ENV ?? 'production',
          owner: 'platform-on-call',
          service: 'monitoring',
          severity: 'warning',
        },
        annotations: {
          summary: 'Controlled monitoring delivery smoke test',
          runbook: 'infrastructure/monitoring/runbooks/alert-delivery.md',
        },
        startsAt: new Date(now).toISOString(),
        endsAt: new Date(now + 5 * 60_000).toISOString(),
      },
    ]),
  });
  process.stdout.write(
    'Synthetic alert submitted; operator confirmation of receipt is required.\n',
  );
}

process.stdout.write(`Monitoring smoke test passed for ${expectedJobs.length} scrape jobs.\n`);
