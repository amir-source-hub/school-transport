import { describe, expect, it } from 'vitest';
import { presignedUrl } from './s3.client';

describe('S3 SigV4 presigned URLs', () => {
  it('matches the AWS documentation presigned GET example', () => {
    const url = presignedUrl({
      method: 'GET',
      endpoint: 'https://examplebucket.s3.amazonaws.com',
      bucket: '',
      key: 'test.txt',
      region: 'us-east-1',
      accessKey: 'AKIAIOSFODNN7EXAMPLE',
      secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      expiresInSeconds: 86_400,
      now: new Date('2013-05-24T00:00:00Z'),
    });
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });

  it('uses path-style URLs with a bucket prefix and encodes object keys', () => {
    const url = presignedUrl({
      method: 'PUT',
      endpoint: 'https://s3.ir-thr-at1.arvanstorage.ir',
      bucket: 'school-transport-dev',
      key: 'student-photos/raw/abc-def.jpg',
      region: 'ir-thr-at1',
      accessKey: 'access',
      secretKey: 'secret',
      expiresInSeconds: 300,
      now: new Date('2026-08-01T00:00:00Z'),
      contentType: 'image/jpeg',
    });
    expect(url.startsWith('https://s3.ir-thr-at1.arvanstorage.ir/school-transport-dev/student-photos/raw/abc-def.jpg?')).toBe(true);
    expect(url).toContain('X-Amz-SignedHeaders=host%3Bcontent-type');
    expect(url).toContain('X-Amz-Expires=300');
  });

  it('signs the same URL deterministically for a fixed clock', () => {
    const base = {
      method: 'PUT',
      endpoint: 'https://s3.example.com',
      bucket: 'bucket',
      key: 'a/b.jpg',
      region: 'r1',
      accessKey: 'ak',
      secretKey: 'sk',
      expiresInSeconds: 60,
      now: new Date('2026-01-01T00:00:00Z'),
    } as const;
    expect(presignedUrl(base)).toBe(presignedUrl(base));
  });
});
