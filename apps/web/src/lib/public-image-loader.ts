import type { ImageLoaderProps } from 'next/image';

/** Routes code-owned /images assets to the immutable public release origin. */
export default function publicImageLoader({ src }: ImageLoaderProps): string {
  if (src === '/samin-gasht-logo.png') {
    const baseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}/images/samin-gasht-logo.png` : src;
  }

  if (!src.startsWith('/images/')) return src;

  const baseUrl = process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, '');
  return baseUrl ? `${baseUrl}${src}` : src;
}
