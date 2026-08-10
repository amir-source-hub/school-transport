import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processReceiptImage, ReceiptImageError } from './receipt-image-processor';

const limits = { maxBytes: 2 * 1024 * 1024, maxPixels: 12_500_000, maxAxis: 8000 };

describe('receipt image processor', () => {
  it.each(['jpeg', 'png'] as const)(
    'normalizes a valid %s to bounded sRGB JPEG without metadata',
    async (format) => {
      let pipeline = sharp({
        create: { width: 1200, height: 1800, channels: 3, background: '#eeeeee' },
      });
      pipeline = format === 'png' ? pipeline.png() : pipeline.jpeg();
      const result = await processReceiptImage(
        await pipeline.withMetadata({ orientation: 6 }).toBuffer(),
        limits,
      );
      const metadata = await sharp(result.canonical).metadata();
      expect(result.mime).toBe('image/jpeg');
      expect(result.width).toBeLessThanOrEqual(1600);
      expect(result.height).toBeLessThanOrEqual(1600);
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(metadata.space).toBe('srgb');
      expect(metadata.exif).toBeUndefined();
    },
  );

  it.each([
    Buffer.alloc(0),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
    Buffer.from('%PDF-1.7'),
    Buffer.from('MZ executable'),
  ])('rejects empty and non-raster/polyglot inputs', async (input) => {
    await expect(processReceiptImage(input, limits)).rejects.toBeInstanceOf(ReceiptImageError);
  });

  it('rejects huge dimensions before decoding the image', async () => {
    const image = await sharp({
      create: { width: 9000, height: 2, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    await expect(processReceiptImage(image, limits)).rejects.toBeInstanceOf(ReceiptImageError);
  });
});
