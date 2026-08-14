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
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const path = `/${[bucket, ...key.split('/')]
    .filter((segment) => segment.length > 0)
    .map(uriEncode)
    .join('/')}`;

  const headers: Array<[string, string]> = [['host', host]];
  if (contentType) headers.push(['content-type', contentType]);
  headers.sort(([left], [right]) => left.localeCompare(right));
  const signedHeaders = headers.map(([name]) => name).join(';');
  const canonicalHeaders = headers.map(([name, value]) => `${name}:${value.trim()}\n`).join('');

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
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const headUrl = this.sign('HEAD', key, 60);
        const headResponse = await fetch(headUrl, { method: 'HEAD' });
        const headLength = headResponse.headers.get('content-length');
        const headSize = headLength === null ? Number.NaN : Number(headLength);
        if (headResponse.ok && Number.isFinite(headSize)) {
          return { size: headSize, etag: headResponse.headers.get('etag') ?? '' };
        }

        // Arvan and other S3-compatible providers can reject HEAD or omit its length while
        // the just-written object is already readable. A ranged GET is the compatible source
        // of truth and avoids reporting a successful browser PUT as missing.
        const rangeUrl = this.sign('GET', key, 60);
        const rangeResponse = await fetch(rangeUrl, { headers: { Range: 'bytes=0-0' } });
        if (!rangeResponse.ok) {
          await rangeResponse.body?.cancel();
          throw new S3StorageError(`Object ${key} metadata unavailable.`);
        }
        const contentRange = rangeResponse.headers.get('content-range');
        const totalMatch = contentRange?.match(/\/(\d+)$/);
        const fallbackLength = rangeResponse.headers.get('content-length');
        const size = totalMatch ? Number(totalMatch[1]) : Number(fallbackLength ?? Number.NaN);
        const etag = rangeResponse.headers.get('etag') ?? headResponse.headers.get('etag') ?? '';
        await rangeResponse.body?.cancel();
        if (Number.isFinite(size)) return { size, etag };
        throw new S3StorageError(`Object ${key} size unavailable.`);
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new S3StorageError(`Object ${key} not available.`);
  }

  async getObject(key: string, maxBytes = Number.POSITIVE_INFINITY): Promise<Buffer> {
    const url = this.sign('GET', key, 60);
    const response = await fetch(url);
    if (!response.ok) throw new S3StorageError(`Object ${key} could not be read.`);
    const declaredLength = Number(response.headers.get('content-length') ?? Number.NaN);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await response.body?.cancel();
      throw new S3StorageError(
        `Object ${key} exceeds the permitted size.`,
        'S3_OBJECT_TOO_LARGE',
        413,
      );
    }
    if (!response.body) return Buffer.alloc(0);
    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    let finished = false;
    try {
      while (!finished) {
        const { done, value } = await reader.read();
        finished = done;
        if (done) continue;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new S3StorageError(
            `Object ${key} exceeds the permitted size.`,
            'S3_OBJECT_TOO_LARGE',
            413,
          );
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks, total);
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
