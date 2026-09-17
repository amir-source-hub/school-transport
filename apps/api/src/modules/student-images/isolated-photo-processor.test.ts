import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processStudentPhotoIsolated } from './isolated-photo-processor';
import type { PhotoProcessingConfig } from './student-photo-processor';

const config: PhotoProcessingConfig = {
  maxBytes: 2 * 1024 * 1024,
  maxPixels: 2_000_000,
  maxAxis: 4000,
  outputWidth: 600,
  outputHeight: 800,
  jpegQuality: 85,
  processingTimeoutSeconds: 5,
};

const image = () =>
  sharp({ create: { width: 900, height: 1200, channels: 3, background: '#d04060' } })
    .png()
    .toBuffer();

describe('processStudentPhotoIsolated', () => {
  it('processes valid images in a bounded child process', async () => {
    const result = await processStudentPhotoIsolated(await image(), config);
    expect(result).toMatchObject({ width: 600, height: 800 });
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('neutralizes decodable image polyglots and harmless trailing bytes by canonicalizing them', async () => {
    const trailingPayload = Buffer.from('<script>polyglots-must-not-survive</script>');
    const pngWithTrailingBytes = Buffer.concat([await image(), trailingPayload]);
    const jpeg = await sharp(await image())
      .jpeg()
      .toBuffer();
    const jpegWithTrailingBytes = Buffer.concat([jpeg, trailingPayload]);
    const pngResult = await processStudentPhotoIsolated(pngWithTrailingBytes, config);
    expect(pngResult).toMatchObject({
      width: 600,
      height: 800,
    });
    expect(pngResult.canonical.includes(trailingPayload)).toBe(false);
    const jpegResult = await processStudentPhotoIsolated(jpegWithTrailingBytes, config);
    expect(jpegResult).toMatchObject({ width: 600, height: 800 });
    expect(jpegResult.canonical.includes(trailingPayload)).toBe(false);
  });

  it('bounds concurrent compressed high-pixel inputs outside the API process', async () => {
    const compressedBomb = await sharp({
      create: { width: 3000, height: 3000, channels: 3, background: '#ffffff' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const before = process.memoryUsage().heapUsed;
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => processStudentPhotoIsolated(compressedBomb, config)),
    );
    expect(results.every(({ status }) => status === 'rejected')).toBe(true);
    for (const result of results) {
      if (result.status === 'rejected') {
        expect(result.reason).toMatchObject({ rejectionCode: 'CORRUPT_IMAGE' });
      }
    }
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(16 * 1024 * 1024);
  });
});
