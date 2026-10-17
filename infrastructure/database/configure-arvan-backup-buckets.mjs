const API = 'https://storage.arvanapis.ir';
const mode = process.argv[2] ?? '--check';

if (!['--check', '--apply'].includes(mode)) {
  throw new Error('usage: node configure-arvan-backup-buckets.mjs [--check|--apply]');
}

const required = [
  'ARVAN_API_AUTHORIZATION',
  'ARVAN_BACKUP_REGION',
  'ARVAN_ROLLING_BACKUP_BUCKET',
  'ARVAN_MONTHLY_BACKUP_BUCKET',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
if (mode === '--apply' && process.env.CONFIRM_ARVAN_BACKUP_BUCKETS !== 'CREATE_LOCKED_BACKUP_BUCKETS') {
  throw new Error('set CONFIRM_ARVAN_BACKUP_BUCKETS=CREATE_LOCKED_BACKUP_BUCKETS');
}

const region = process.env.ARVAN_BACKUP_REGION;
if (!['ir-central1', 'ir-northwest1'].includes(region)) throw new Error('unsupported Arvan region');
const buckets = [
  {
    name: process.env.ARVAN_ROLLING_BACKUP_BUCKET,
    retention: integer('ARVAN_ROLLING_LOCK_DAYS', 35, 35),
  },
  {
    name: process.env.ARVAN_MONTHLY_BACKUP_BUCKET,
    retention: integer('ARVAN_MONTHLY_LOCK_DAYS', 400, 365),
  },
];
if (buckets[0].name === buckets[1].name) throw new Error('rolling and monthly buckets must differ');
for (const bucket of buckets) {
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket.name)) {
    throw new Error(`invalid Arvan bucket name: ${bucket.name}`);
  }
}

async function request(path, options = {}, allowed = [200]) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      authorization: process.env.ARVAN_API_AUTHORIZATION,
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    throw new Error(`Arvan returned invalid JSON for ${path} (${response.status})`);
  }
  if (!allowed.includes(response.status)) {
    throw new Error(`Arvan request failed for ${path}: HTTP ${response.status}`);
  }
  return { status: response.status, payload };
}

const dataOf = (payload) => payload?.data ?? payload;

async function inspect(bucket) {
  const bucketResponse = await request(`/v1/buckets/${encodeURIComponent(bucket.name)}`, {}, [200, 404]);
  if (bucketResponse.status === 404) return { exists: false };
  const [versioningResponse, lockResponse] = await Promise.all([
    request(`/v1/buckets/${encodeURIComponent(bucket.name)}/versioning`),
    request(`/v1/buckets/${encodeURIComponent(bucket.name)}/lock`),
  ]);
  return {
    exists: true,
    bucket: dataOf(bucketResponse.payload),
    versioning: dataOf(versioningResponse.payload),
    lock: dataOf(lockResponse.payload),
  };
}

function compliant(bucket, state) {
  if (!state.exists) return false;
  const isPublic = state.bucket?.isPublic ?? state.bucket?.public;
  const versioning = state.versioning?.isActive ?? state.bucket?.versioningEnabled;
  const lockEnabled = state.lock?.enabled ?? state.lock?.isActive ?? state.bucket?.lockEnabled;
  const retention = Number(state.lock?.retention ?? state.lock?.lockRetention ?? state.bucket?.lockRetention);
  return isPublic === false && versioning === true && lockEnabled === true && retention >= bucket.retention;
}

async function apply(bucket, state) {
  if (!state.exists) {
    await request('/v1/buckets', {
      method: 'POST',
      body: JSON.stringify({
        name: bucket.name,
        region,
        isPublic: false,
        versioningEnabled: true,
        lockEnabled: true,
        lockRetention: bucket.retention,
      }),
    }, [200, 201, 202]);
    return;
  }
  if ((state.bucket?.isPublic ?? state.bucket?.public) !== false) {
    throw new Error(`${bucket.name} exists but is public; make it private in a separately reviewed operation`);
  }
  await request(`/v1/buckets/${encodeURIComponent(bucket.name)}/versioning`, {
    method: 'POST',
    body: JSON.stringify({ isActive: true }),
  }, [200, 202]);
  await request(`/v1/buckets/${encodeURIComponent(bucket.name)}/lock`, {
    method: 'PUT',
    body: JSON.stringify({ retention: bucket.retention }),
  }, [200, 204]);
}

for (const bucket of buckets) {
  let state = await inspect(bucket);
  if (mode === '--apply' && !compliant(bucket, state)) {
    await apply(bucket, state);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      state = await inspect(bucket);
      if (compliant(bucket, state)) break;
    }
  }
  if (!compliant(bucket, state)) {
    throw new Error(`${bucket.name} is missing or does not meet private/versioned/locked retention requirements`);
  }
  process.stdout.write(`validated Arvan bucket ${bucket.name}: private, versioned, lock>=${bucket.retention}d\n`);
}

function integer(name, fallback, minimum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > 3650) {
    throw new Error(`${name} must be an integer from ${minimum} to 3650`);
  }
  return value;
}
