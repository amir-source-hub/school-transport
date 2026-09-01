import { afterEach, describe, expect, it, vi } from 'vitest';
import { PUT } from './route';

describe('student photo same-site upload fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN;
  });

  it('forwards a signed upload only to the configured private storage origin', async () => {
    process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN = 'https://storage.example.com';
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const target =
      'https://storage.example.com/bucket/photo.jpg?X-Amz-Signature=signature&X-Amz-Date=20260815T000000Z';

    const response = await PUT(
      new Request('https://site.example.com/api/student-photo-upload', {
        method: 'PUT',
        body: new Uint8Array([1, 2, 3]),
        headers: { 'Content-Type': 'image/jpeg', 'X-Upload-Target': target },
      }),
    );

    expect(response.status).toBe(204);
    expect(upstream).toHaveBeenCalledWith(
      new URL(target),
      expect.objectContaining({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } }),
    );
  });

  it('rejects an upload target on another origin', async () => {
    process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN = 'https://storage.example.com';
    const upstream = vi.fn();
    vi.stubGlobal('fetch', upstream);

    const response = await PUT(
      new Request('https://site.example.com/api/student-photo-upload', {
        method: 'PUT',
        body: new Uint8Array([1]),
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Upload-Target': 'https://attacker.example/file?X-Amz-Signature=x',
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('allows the configured loopback MinIO origin in local development', async () => {
    process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN = 'http://127.0.0.1:9000';
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const target =
      'http://127.0.0.1:9000/school-transport-local/student-photo.jpg?X-Amz-Signature=signature';

    const response = await PUT(
      new Request('http://localhost:3000/api/student-photo-upload', {
        method: 'PUT',
        body: new Uint8Array([1, 2, 3]),
        headers: { 'Content-Type': 'image/jpeg', 'X-Upload-Target': target },
      }),
    );

    expect(response.status).toBe(204);
    expect(upstream).toHaveBeenCalledOnce();
  });

  it('allows a loopback target without upload-origin configuration outside production', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);

    const response = await PUT(
      new Request('http://localhost:3000/api/student-photo-upload', {
        method: 'PUT',
        body: new Uint8Array([1]),
        headers: {
          'Content-Type': 'image/png',
          'X-Upload-Target': 'http://localhost:9000/local/photo.png?X-Amz-Signature=signature',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(upstream).toHaveBeenCalledOnce();
  });
});
