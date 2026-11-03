import { NextResponse } from 'next/server';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export async function PUT(request: Request) {
  const targetValue = request.headers.get('x-upload-target');
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  const declaredLength = Number(request.headers.get('content-length') ?? Number.NaN);
  const configuredOrigin = process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN;

  if (!targetValue || !contentType || !ACCEPTED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  let target: URL;
  let allowedOrigin: string;
  try {
    target = new URL(targetValue);
    const targetIsLocal = ['localhost', '127.0.0.1', '::1'].includes(target.hostname);
    allowedOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : process.env.NODE_ENV !== 'production' && targetIsLocal
        ? target.origin
        : '';
  } catch {
    return NextResponse.json({ error: 'Invalid upload target.' }, { status: 400 });
  }

  const targetIsLoopback = ['localhost', '127.0.0.1', '::1'].includes(target.hostname);
  if ((target.protocol !== 'https:' && !targetIsLoopback) || target.origin !== allowedOrigin || !target.searchParams.has('X-Amz-Signature')) {
    return NextResponse.json({ error: 'Upload target is not allowed.' }, { status: 403 });
  }
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is too large.' }, { status: 413 });
  }

  if (!request.body || declaredLength === 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
  }

  try {
    // Forward the request stream instead of materializing another full copy of the file in
    // Next.js memory. This matters on memory-constrained driver phones and server containers.
    const upstream = await fetch(target, {
      method: 'PUT',
      body: request.body,
      headers: { 'Content-Type': contentType },
      cache: 'no-store',
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
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
