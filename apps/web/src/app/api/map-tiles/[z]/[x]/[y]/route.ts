import { NextResponse } from 'next/server';

export const revalidate = 86_400;

const TILE_SEGMENT = /^\d+$/;
const MAX_ZOOM = 19;

function parseTileCoordinates(parts: { z: string; x: string; y: string }) {
  if (![parts.z, parts.x, parts.y].every((part) => TILE_SEGMENT.test(part))) return null;
  const z = Number(parts.z);
  const x = Number(parts.x);
  const y = Number(parts.y);
  if (![z, x, y].every(Number.isSafeInteger) || z < 0 || z > MAX_ZOOM) return null;
  const tilesPerAxis = 2 ** z;
  if (x < 0 || y < 0 || x >= tilesPerAxis || y >= tilesPerAxis) return null;
  return { z, x, y };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const coordinates = parseTileCoordinates(await params);
  if (!coordinates) {
    return new NextResponse('Invalid tile coordinates', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const { z, x, y } = coordinates;
    const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: {
        'User-Agent': 'SchoolTransport/1.0 (school transport enrollment map)',
      },
      next: { revalidate },
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) {
      return new NextResponse('Map tile unavailable', {
        status: upstream.status === 404 ? 404 : 502,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
      });
    }
    if (!upstream.headers.get('content-type')?.startsWith('image/')) {
      return new NextResponse('Invalid map tile response', {
        status: 502,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
      });
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Map tile service unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
    });
  }
}
