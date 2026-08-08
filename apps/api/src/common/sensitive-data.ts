const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'otp',
  'otpcode',
  'codehash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'setcookie',
  'secret',
  'secretkey',
  'paymentcredentials',
  'nationalid',
  'phonenumber',
  'mobile',
  'homephone',
  'managerphone',
  'address',
  'streetaddress',
  'postalcode',
  'latitude',
  'longitude',
  'coordinates',
  'contracttext',
  'contractdatasnapshot',
  'gatewaytransactionid',
  'receiptreference',
]);

const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

export function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEYS.has(normalizeKey(key)) ? '[REDACTED]' : redactSensitiveData(nestedValue),
    ]),
  );
}

export function serializeSafeAuditValues(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    try {
      return JSON.stringify(redactSensitiveData(JSON.parse(value)));
    } catch {
      return JSON.stringify('[REDACTED_NON_JSON_AUDIT_VALUE]');
    }
  }

  return JSON.stringify(redactSensitiveData(value));
}
