import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const context = (z: string, x: string, y: string) => ({ params: Promise.resolve({ z, x, y }) });

describe('map tile route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects coordinates outside the selected zoom tile grid without contacting upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/map-tiles/2/4/1'), context('2', '4', '1'));

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies a valid image tile with durable browser caching and attribution-safe provider use', async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/png' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(new Request('http://localhost/api/map-tiles/2/1/2'), context('2', '1', '2'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('stale-while-revalidate');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://tile.openstreetmap.org/2/1/2.png',
      expect.objectContaining({
        headers: {
          'User-Agent': 'SaminGashtSchoolTransport/1.0 (+https://samingasht.ir/contact)',
        },
        next: { revalidate: 604_800 },
      }),
    );
  });

  it('returns a controlled retryable response when the provider times out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

    const response = await GET(new Request('http://localhost/api/map-tiles/1/0/0'), context('1', '0', '0'));

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('5');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('maps a provider 404 to a missing-tile 404 without caching', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not found', { status: 404 })),
    );

    const response = await GET(new Request('http://localhost/api/map-tiles/2/1/2'), context('2', '1', '2'));

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('5');
  });

  it('rejects a non-image upstream response as a server error (502)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('html', { status: 200, headers: { 'Content-Type': 'text/html' } })),
    );

    const response = await GET(new Request('http://localhost/api/map-tiles/2/1/2'), context('2', '1', '2'));

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('5');
  });
});
