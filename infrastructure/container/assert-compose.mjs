import { readFileSync } from 'node:fs';

const [modelPath] = process.argv.slice(2);
if (!modelPath) throw new Error('usage: node assert-compose.mjs <compose-model.json>');

const model = JSON.parse(readFileSync(modelPath, 'utf8'));
const services = model.services ?? {};
const expectedServices = ['postgres', 'redis', 'api', 'worker', 'bootstrap', 'web', 'caddy'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const name of expectedServices) {
  const service = services[name];
  assert(service, `missing service: ${name}`);
  assert(service.read_only === true, `${name}: root filesystem must be read-only`);
  assert(service.cap_drop?.includes('ALL'), `${name}: cap_drop must include ALL`);
  assert(
    service.security_opt?.includes('no-new-privileges:true'),
    `${name}: no-new-privileges must be enabled`,
  );
  assert(Number(service.pids_limit) > 0, `${name}: positive pids_limit is required`);
  assert(Number(service.cpus) > 0, `${name}: positive CPU limit is required`);
  assert(Number(service.mem_limit) > 0, `${name}: positive memory limit is required`);
  assert(service.stop_grace_period, `${name}: bounded stop_grace_period is required`);

  const temporary = service.tmpfs?.find((entry) => entry.startsWith('/tmp:'));
  assert(temporary, `${name}: writable /tmp tmpfs is required`);
  for (const option of ['rw', 'noexec', 'nosuid', 'nodev', 'size=', 'mode=1777']) {
    assert(temporary.includes(option), `${name}: /tmp must include ${option}`);
  }
}

for (const name of ['postgres', 'redis', 'caddy']) {
  assert(services[name].init === true, `${name}: Docker init must be enabled`);
  assert(/@sha256:[a-f0-9]{64}$/.test(services[name].image), `${name}: image must use a digest`);
}

for (const [name, allowed] of Object.entries({
  postgres: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETGID', 'SETUID'],
  redis: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'SETGID', 'SETUID'],
  caddy: ['NET_BIND_SERVICE'],
})) {
  const actual = [...(services[name].cap_add ?? [])].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify([...allowed].sort()),
    `${name}: unexpected cap_add`,
  );
}

for (const [name, target] of [
  ['postgres', '/var/lib/postgresql/data'],
  ['redis', '/data'],
  ['caddy', '/data'],
  ['caddy', '/config'],
]) {
  const volume = services[name].volumes?.find(
    (entry) => entry.type === 'volume' && entry.target === target,
  );
  assert(volume && volume.read_only !== true, `${name}: ${target} must remain a writable volume`);
}

for (const network of ['backend', 'application', 'proxy_api']) {
  assert(model.networks?.[network]?.internal === true, `${network}: network must remain internal`);
}
assert(
  services.caddy.networks?.proxy_api?.ipv4_address === '172.30.20.2',
  'caddy: trusted proxy address changed',
);
assert(!services.web.networks?.proxy_api, 'web must not join the trusted proxy network');
assert(!services.worker.networks?.proxy_api, 'worker must not join the trusted proxy network');

const postgres = services.postgres;
assert(!postgres.ports?.length, 'postgres must not publish host ports');
assert(!postgres.expose?.length, 'postgres must not declare externally published ports');
assert(
  Object.keys(postgres.networks ?? {}).length === 1 && postgres.networks.backend !== undefined,
  'postgres must attach only to the internal backend network',
);
assert(
  postgres.environment?.POSTGRES_HOST_AUTH_METHOD === 'scram-sha-256',
  'postgres host authentication must be SCRAM',
);
assert(
  postgres.environment?.POSTGRES_INITDB_ARGS?.includes('--auth-host=scram-sha-256') &&
    postgres.environment.POSTGRES_INITDB_ARGS.includes('--auth-local=scram-sha-256'),
  'postgres initdb authentication arguments are incomplete',
);
assert(
  postgres.command?.includes('password_encryption=scram-sha-256') &&
    postgres.command.includes('hba_file=/etc/postgresql/pg_hba.conf'),
  'postgres server must enforce SCRAM password storage and the reviewed HBA file',
);
const hbaMount = postgres.volumes?.find(
  (entry) => entry.type === 'bind' && entry.target === '/etc/postgresql/pg_hba.conf',
);
assert(hbaMount?.read_only === true, 'postgres HBA configuration must be mounted read-only');

console.log(`validated ${expectedServices.length} hardened Compose services`);
