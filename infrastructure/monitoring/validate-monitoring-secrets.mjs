import { readFile, stat } from 'node:fs/promises';

const production = (process.env.DEPLOY_ENV ?? 'production') === 'production';
const requiredFiles = {
  METRICS_BEARER_TOKEN_FILE: 32,
  POSTGRES_EXPORTER_PASSWORD_FILE: 32,
  GRAFANA_ADMIN_PASSWORD_FILE: 20,
  ALERT_WEBHOOK_URL_FILE: 1,
  REDIS_EXPORTER_PASSWORD_MAP_FILE: 1,
};

const contents = new Map();
for (const [name, minimumLength] of Object.entries(requiredFiles)) {
  const path = process.env[name];
  if (!path) throw new Error(`${name} is required.`);
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new Error(`${name} must reference a regular file.`);
  if (process.platform !== 'win32' && (metadata.mode & 0o077) !== 0) {
    throw new Error(`${name} must not be accessible by group or other users.`);
  }
  const value = (await readFile(path, 'utf8')).trim();
  if (value.length < minimumLength) {
    throw new Error(`${name} does not meet its minimum secret length.`);
  }
  contents.set(name, value);
}

let webhook;
try {
  webhook = new URL(contents.get('ALERT_WEBHOOK_URL_FILE'));
} catch {
  throw new Error('ALERT_WEBHOOK_URL_FILE must contain a valid URL.');
}
if (production && webhook.protocol !== 'https:') {
  throw new Error('The production alert webhook must use HTTPS.');
}
if (!['https:', 'http:'].includes(webhook.protocol)) {
  throw new Error('The alert webhook must use HTTP or HTTPS.');
}

let redisPasswordMap;
try {
  redisPasswordMap = JSON.parse(contents.get('REDIS_EXPORTER_PASSWORD_MAP_FILE'));
} catch {
  throw new Error('REDIS_EXPORTER_PASSWORD_MAP_FILE must contain valid JSON.');
}
const redisPassword = redisPasswordMap?.['redis://redis:6379'];
if (typeof redisPassword !== 'string' || redisPassword.length < 32) {
  throw new Error(
    'The Redis exporter password map must contain a 32-character password for redis://redis:6379.',
  );
}
if (Object.keys(redisPasswordMap).length !== 1) {
  throw new Error(
    'The Redis exporter password map must contain only the monitored Redis endpoint.',
  );
}

process.stdout.write('Monitoring secret structure and permissions passed validation.\n');
