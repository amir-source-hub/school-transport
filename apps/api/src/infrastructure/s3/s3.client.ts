import { createHash, createHmac } from 'node:crypto';

export interface S3ClientConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

export class S3StorageError extends Error {
  constructor(
    message: string,
    public readonly code = 'S3_STORAGE_ERROR',
    public readonly status = 502,
  ) {
    super(message);
    this.name = 'S3StorageError';
  }
}

function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function canonicalQuery(pairs: Array<[string, string]>): string {
  return pairs
    .map(([key, value]) => [uriEncode(key), uriEncode(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function signingKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

export function presignedUrl(input: {
  method: string;
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKey: string;
  secretKey: string;
  expiresInSeconds: number;
  now?: Date;
  contentType?: string;
}): string {
  const {
    method,
    endpoint,
    bucket,
    key,
    region,
    accessKey,
    secretKey,
    expiresInSeconds,
    now = new Date(),
    contentType,
  } = input;
  const url = new URL(endpoint.replace(/\/$/, ''));
  const host = url.host;
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const path = `/${[bucket, ...key.split('/')]
    .filter((segment) => segment.length > 0)
    .map(uriEncode)
    .join('/')}`;

  const headers: Array<[string, string]> = [['host', host]];
  if (contentType) headers.push(['content-type', contentType]);
  const signedHeaders = headers.map(([name]) => name).join(';');
  const canonicalHeaders = headers
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .join('');

  const query = canonicalQuery([
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKey}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresInSeconds)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ]);
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signature = hmac(signingKey(secretKey, dateStamp, region, 's3'), stringToSign).toString(
    'hex',
  );
  return `${url.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

export class S3Client {
  private readonly host: string;
  private readonly origin: string;

  constructor(private readonly config: S3ClientConfig) {
    const url = new URL(config.endpoint.replace(/\/$/, ''));
    this.host = url.host;
    this.origin = url.origin;
  }

  private sign(method: string, key: string, expiresInSeconds: number, contentType?: string) {
    return presignedUrl({
      method,
      endpoint: this.config.endpoint,
      bucket: this.config.bucket,
      key,
      region: this.config.region,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
      expiresInSeconds,
      contentType,
    });
  }

  presignPut(key: string, contentType: string, expiresInSeconds: number): string {
    return this.sign('PUT', key, expiresInSeconds, contentType);
  }

  presignGet(key: string, expiresInSeconds: number): string {
    return this.sign('GET', key, expiresInSeconds);
  }

  async headObject(key: string): Promise<{ size: number; etag: string }> {
    const url = this.sign('HEAD', key, 60);
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) throw new S3StorageError(`Object ${key} not available.`);
    const size = Number(response.headers.get('content-length') ?? '0');
    const etag = response.headers.get('etag') ?? '';
    return { size, etag };
  }

  async getObject(key: string): Promise<Buffer> {
    const url = this.sign('GET', key, 60);
    const response = await fetch(url);
    if (!response.ok) throw new S3StorageError(`Object ${key} could not be read.`);
    return Buffer.from(await response.arrayBuffer());
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
    expiresInSeconds = 60,
  ): Promise<void> {
    const url = this.sign('PUT', key, expiresInSeconds, contentType);
    const response = await fetch(url, {
      method: 'PUT',
      body: new Uint8Array(body),
      headers: { 'Content-Type': contentType },
    });
    if (!response.ok) throw new S3StorageError(`Object ${key} could not be written.`);
  }

  async deleteObject(key: string): Promise<void> {
    const url = this.sign('DELETE', key, 60);
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      throw new S3StorageError(`Object ${key} could not be deleted.`);
    }
  }
}
