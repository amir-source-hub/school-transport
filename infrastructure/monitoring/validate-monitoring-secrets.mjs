import { readFile, stat } from 'node:fs/promises';

const requiredFiles = {
  METRICS_BEARER_TOKEN_FILE: 32,
  POSTGRES_EXPORTER_PASSWORD_FILE: 32,
  GRAFANA_ADMIN_PASSWORD_FILE: 20,
  BALE_BOT_TOKEN_FILE: 20,
  BALE_CHAT_ID_FILE: 1,
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

if (!/^-?[1-9]\d*$/.test(contents.get('BALE_CHAT_ID_FILE'))) {
  throw new Error('BALE_CHAT_ID_FILE must contain one non-zero numeric chat ID.');
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
