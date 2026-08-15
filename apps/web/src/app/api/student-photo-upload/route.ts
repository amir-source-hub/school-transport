import { NextResponse } from 'next/server';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png']);

export async function PUT(request: Request) {
  const targetValue = request.headers.get('x-upload-target');
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  const declaredLength = Number(request.headers.get('content-length') ?? Number.NaN);
  const configuredOrigin = process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN;

  if (!targetValue || !configuredOrigin || !contentType || !ACCEPTED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  let target: URL;
  let allowedOrigin: string;
  try {
    target = new URL(targetValue);
    allowedOrigin = new URL(configuredOrigin).origin;
  } catch {
    return NextResponse.json({ error: 'Invalid upload target.' }, { status: 400 });
  }

  if (target.protocol !== 'https:' || target.origin !== allowedOrigin || !target.searchParams.has('X-Amz-Signature')) {
    return NextResponse.json({ error: 'Upload target is not allowed.' }, { status: 403 });
  }
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Photo is too large.' }, { status: 413 });
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: bytes.byteLength === 0 ? 'Photo is empty.' : 'Photo is too large.' },
      { status: bytes.byteLength === 0 ? 400 : 413 },
    );
  }

  try {
    const upstream = await fetch(target, {
      method: 'PUT',
      body: bytes,
      headers: { 'Content-Type': contentType },
      cache: 'no-store',
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return NextResponse.json({ error: 'Storage rejected the photo.' }, { status: upstream.status });
    }
    await upstream.body?.cancel();
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Storage is unreachable.' }, { status: 502 });
  }
}
