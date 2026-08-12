import { describe, expect, it, vi } from 'vitest';

import publicImageLoader from './public-image-loader';

describe('publicImageLoader', () => {
  it('maps public site images to the configured immutable asset origin', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_ASSET_BASE_URL',
      'https://assets.example.test/public/site/release-123/',
    );
    expect(publicImageLoader({ src: '/images/hero.webp', width: 1200, quality: 85 })).toBe(
      'https://assets.example.test/public/site/release-123/images/hero.webp',
    );
    vi.unstubAllEnvs();
  });

  it('keeps local and private/signed image URLs unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_ASSET_BASE_URL', '');
    expect(publicImageLoader({ src: '/images/hero.webp', width: 1200 })).toBe('/images/hero.webp');
    expect(
      publicImageLoader({ src: 'https://private.example.test/photo?signature=1', width: 600 }),
    ).toBe('https://private.example.test/photo?signature=1');
    vi.unstubAllEnvs();
  });
});
