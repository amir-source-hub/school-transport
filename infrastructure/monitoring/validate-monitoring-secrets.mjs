const requiredValues = {
  METRICS_BEARER_TOKEN: 32,
  POSTGRES_EXPORTER_PASSWORD: 32,
  GRAFANA_ADMIN_PASSWORD: 20,
  BALE_BOT_TOKEN: 20,
  BALE_CHAT_ID: 1,
  REDIS_EXPORTER_PASSWORD_MAP: 1,
};

const contents = new Map();
for (const [name, minimumLength] of Object.entries(requiredValues)) {
  const value = process.env[name]?.trim() ?? '';
  if (value.length < minimumLength) {
    throw new Error(`${name} is required and does not meet its minimum secret length.`);
  }
  contents.set(name, value);
}

if (!/^-?[1-9]\d*$/.test(contents.get('BALE_CHAT_ID'))) {
  throw new Error('BALE_CHAT_ID must contain one non-zero numeric chat ID.');
}

let redisPasswordMap;
try {
  redisPasswordMap = JSON.parse(contents.get('REDIS_EXPORTER_PASSWORD_MAP'));
} catch {
  throw new Error('REDIS_EXPORTER_PASSWORD_MAP must contain valid JSON.');
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

process.stdout.write('Monitoring secret values passed structural validation.\n');
