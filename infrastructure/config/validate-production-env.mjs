import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] ?? '.env');
const values = new Map();
for (const [index, raw] of readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator < 1) throw new Error(`Invalid environment entry on line ${index + 1}.`);
  const name = line.slice(0, separator).trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(name))
    throw new Error(`Invalid variable name on line ${index + 1}.`);
  if (values.has(name)) throw new Error(`Duplicate production variable: ${name}.`);
  values.set(name, line.slice(separator + 1).trim());
}

const required = [
  'NODE_ENV',
  'DEPLOYMENT_PROFILE',
  'APP_DOMAIN',
  'ACME_EMAIL',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'REDIS_PASSWORD',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'METRICS_BEARER_TOKEN',
  'OTP_PROVIDER',
  'ARVAN_S3_ENDPOINT',
  'ARVAN_S3_REGION',
  'ARVAN_S3_BUCKET',
  'ARVAN_S3_ACCESS_KEY',
  'ARVAN_S3_SECRET_KEY',
  'NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_ASSET_BASE_URL',
  'API_INTERNAL_BASE_URL',
  'NEXT_DEPLOYMENT_ID',
  'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY',
  'CORS_ORIGINS',
  'TRUSTED_PROXY_CIDRS',
];
const errors = [];
for (const name of required) {
  const value = values.get(name) ?? '';
  if (!value) errors.push(`${name} is required`);
  if (/CHANGE_ME|replace|development|localhost/i.test(value))
    errors.push(`${name} contains a placeholder or development value`);
}
for (const name of ['POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'JWT_SECRET', 'METRICS_BEARER_TOKEN']) {
  if ((values.get(name) ?? '').length < 32)
    errors.push(`${name} must contain at least 32 characters`);
}
if (values.get('NODE_ENV') !== 'production') errors.push('NODE_ENV must be production');
const profile = values.get('DEPLOYMENT_PROFILE');
if (!['preview', 'production'].includes(profile ?? '')) {
  errors.push('DEPLOYMENT_PROFILE must be preview or production');
}
if (profile === 'production' && values.get('OTP_PROVIDER') !== 'kavenegar') {
  errors.push('production profile requires OTP_PROVIDER=kavenegar');
}
if (
  profile === 'production' &&
  (!(values.get('KAVEHNEGAR_API_KEY') ?? '') || !(values.get('KAVEHNEGAR_OTP_TEMPLATE') ?? ''))
) {
  errors.push('production profile requires Kavenegar API key and approved OTP template');
}
if (profile === 'production' && values.get('SEED_DEMO_DATA') !== 'false') {
  errors.push('production profile requires SEED_DEMO_DATA=false');
}
if (profile === 'preview' && values.get('OTP_PROVIDER') !== 'none') {
  errors.push('preview without provider must use OTP_PROVIDER=none, never console');
}
if (profile === 'preview' && values.get('SEED_DEMO_DATA') !== 'true') {
  errors.push('preview profile requires explicit SEED_DEMO_DATA=true');
}
if (profile === 'preview' && (values.get('SEED_ADMIN_PASSWORD') ?? '').length < 12) {
  errors.push('preview SEED_ADMIN_PASSWORD must contain at least 12 characters');
}
if (values.get('API_DOCS_ENABLED') !== 'false') errors.push('API_DOCS_ENABLED must be false');
if (values.get('LOG_LEVEL') === 'debug') errors.push('LOG_LEVEL must not be debug');
for (const name of [
  'ARVAN_S3_ENDPOINT',
  'NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_ASSET_BASE_URL',
]) {
  try {
    const url = new URL(values.get(name) ?? '');
    if (url.protocol !== 'https:') errors.push(`${name} must use HTTPS`);
    if (url.username || url.password) errors.push(`${name} must not contain URL credentials`);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}
const expectedOrigin = `https://${values.get('APP_DOMAIN')}`;
if (values.get('CORS_ORIGINS') !== expectedOrigin)
  errors.push(`CORS_ORIGINS must equal ${expectedOrigin}`);
if (values.get('NEXT_PUBLIC_API_BASE_URL') !== `${expectedOrigin}/api/v1`)
  errors.push('NEXT_PUBLIC_API_BASE_URL must match APP_DOMAIN');
const decodedKey = Buffer.from(values.get('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY') ?? '', 'base64');
if (decodedKey.length !== 32)
  errors.push('NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must decode to exactly 32 bytes');
if (process.platform !== 'win32' && (statSync(file).mode & 0o077) !== 0)
  errors.push('production server .env permissions must be 0600');
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  process.exit(1);
}
console.log(`validated ${values.size} production variables without printing values`);
