import { NextResponse } from 'next/server';
import { getAdminPhotoViewUrl } from '@/features/student-photos/admin-student-photos-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  try {
    const { uploadId } = await params;
    const { viewUrl } = await getAdminPhotoViewUrl(uploadId);
    const upstream = await fetch(viewUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: 'Photo unavailable.' }, { status: 502 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Photo unavailable.' }, { status: 502 });
  }
}
