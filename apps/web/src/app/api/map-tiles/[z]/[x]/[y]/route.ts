import { NextResponse } from 'next/server';

export const revalidate = 86_400;

const TILE_SEGMENT = /^\d+$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  if (![z, x, y].every((part) => TILE_SEGMENT.test(part)) || Number(z) > 19) {
    return new NextResponse('Invalid tile coordinates', { status: 400 });
  }

  const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: { 'User-Agent': 'SchoolTransport/1.0 (map tile proxy)' },
    next: { revalidate },
  });
  if (!upstream.ok) {
    return new NextResponse('Map tile unavailable', { status: upstream.status });
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
