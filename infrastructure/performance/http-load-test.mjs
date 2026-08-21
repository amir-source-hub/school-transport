import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const baseUrl = process.env.LOAD_TEST_BASE_URL ?? 'http://127.0.0.1:5000';
const path = process.env.LOAD_TEST_PATH ?? '/api/v1/health/ready';
const concurrency = positiveInteger('LOAD_TEST_CONCURRENCY', 500);
const durationSeconds = positiveInteger('LOAD_TEST_DURATION_SECONDS', 30);
const maxErrorRate = finiteNumber('LOAD_TEST_MAX_ERROR_RATE', 0.01);
const maxP95Ms = finiteNumber('LOAD_TEST_MAX_P95_MS', 1000);
const tokens = await loadTokens(process.env.LOAD_TEST_BEARER_TOKENS_FILE);
const deadline = Date.now() + durationSeconds * 1000;
const latencies = [];
const statuses = new Map();
let networkErrors = 0;

async function virtualUser(index) {
  const token = tokens.length > 0 ? tokens[index % tokens.length] : undefined;
  while (Date.now() < deadline) {
    const started = performance.now();
    try {
      const response = await fetch(new URL(path, baseUrl), {
        headers: {
          'x-correlation-id': randomUUID(),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      await response.arrayBuffer();
    } catch {
      networkErrors += 1;
    } finally {
      latencies.push(performance.now() - started);
    }
  }
}

console.log(
  `Load test: ${concurrency} concurrent sessions for ${durationSeconds}s against ${new URL(path, baseUrl)}`,
);
await Promise.all(Array.from({ length: concurrency }, (_, index) => virtualUser(index)));

latencies.sort((left, right) => left - right);
const requests = latencies.length;
const httpErrors = [...statuses.entries()]
  .filter(([status]) => status >= 400)
  .reduce((total, [, count]) => total + count, 0);
const errors = networkErrors + httpErrors;
const errorRate = requests === 0 ? 1 : errors / requests;
const p95 = percentile(latencies, 0.95);
const result = {
  concurrency,
  durationSeconds,
  requests,
  requestsPerSecond: Number((requests / durationSeconds).toFixed(2)),
  statusCounts: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)),
  networkErrors,
  errorRate: Number(errorRate.toFixed(4)),
  latencyMs: {
    p50: percentile(latencies, 0.5),
    p95,
    p99: percentile(latencies, 0.99),
    max: Number((latencies.at(-1) ?? 0).toFixed(2)),
  },
};
console.log(JSON.stringify(result, null, 2));

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  console.error(`Threshold failed: errorRate <= ${maxErrorRate}, p95 <= ${maxP95Ms}ms.`);
  process.exitCode = 1;
}

function percentile(values, quantile) {
  if (values.length === 0) return 0;
  return Number(
    values[Math.min(values.length - 1, Math.floor(values.length * quantile))].toFixed(2),
  );
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${name} must be a positive integer.`);
  return value;
}

function finiteNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative number.`);
  return value;
}

async function loadTokens(file) {
  if (!file) return [];
  const contents = await readFile(file, 'utf8');
  return contents
    .split(/\r?\n/u)
    .map((token) => token.trim())
    .filter(Boolean);
}
