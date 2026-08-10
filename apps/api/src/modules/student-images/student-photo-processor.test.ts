import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  detectMagicType,
  PhotoValidationError,
  processStudentPhoto,
  type PhotoProcessingConfig,
} from './student-photo-processor';

const config: PhotoProcessingConfig = {
  maxBytes: 2 * 1024 * 1024,
  maxPixels: 12_500_000,
  maxAxis: 8000,
  outputWidth: 600,
  outputHeight: 800,
  jpegQuality: 85,
};

async function makePng(width: number, height: number, channels: 3 | 4 = 3): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels,
      background: { r: 200, g: 40, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe('detectMagicType', () => {
  it('recognizes JPEG and PNG headers', async () => {
    const jpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .jpeg()
      .toBuffer();
    const png = await makePng(10, 10);
    expect(detectMagicType(jpeg)).toBe('image/jpeg');
    expect(detectMagicType(png)).toBe('image/png');
  });

  it('rejects a non-image buffer', () => {
    expect(detectMagicType(Buffer.from('this is definitely not an image'))).toBeNull();
  });
});

describe('processStudentPhoto', () => {
  it('rejects an empty buffer', async () => {
    await expect(processStudentPhoto(Buffer.alloc(0), config)).rejects.toMatchObject({
      rejectionCode: 'ZERO_BYTE',
    });
  });

  it('rejects a file over the byte limit', async () => {
    const png = await makePng(100, 100);
    const padded = Buffer.concat([png, Buffer.alloc(config.maxBytes - png.length + 1)]);
    await expect(processStudentPhoto(padded, config)).rejects.toMatchObject({
      rejectionCode: 'TOO_LARGE',
    });
  });

  it('rejects a non-image payload even under the size limit', async () => {
    await expect(processStudentPhoto(Buffer.from('hello world'), config)).rejects.toMatchObject({
      rejectionCode: 'UNSUPPORTED_FORMAT',
    });
  });

  it('rejects an image above the pixel limit', async () => {
    const big = await makePng(1500, 1500);
    await expect(
      processStudentPhoto(big, { ...config, maxPixels: 1500 * 1500 - 1 }),
    ).rejects.toMatchObject({ rejectionCode: 'TOO_MANY_PIXELS' });
  });

  it('rejects an image above the axis limit', async () => {
    const tall = await makePng(100, 9000);
    await expect(
      processStudentPhoto(tall, { ...config, maxPixels: 12_500_000 }),
    ).rejects.toMatchObject({ rejectionCode: 'EXTREME_AXIS' });
  });

  it('rejects extreme aspect ratios and renamed non-image documents', async () => {
    const strip = await makePng(2000, 100);
    await expect(processStudentPhoto(strip, config)).rejects.toMatchObject({
      rejectionCode: 'EXTREME_ASPECT_RATIO',
    });
    for (const payload of [
      Buffer.from('%PDF-1.7'),
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    ]) {
      await expect(processStudentPhoto(payload, config)).rejects.toMatchObject({
        rejectionCode: 'UNSUPPORTED_FORMAT',
      });
    }
  });

  it('produces a canonical JPEG at the configured output size', async () => {
    const png = await makePng(1200, 1600, 4);
    const result = await processStudentPhoto(png, config);
    expect(result.width).toBe(config.outputWidth);
    expect(result.height).toBe(config.outputHeight);
    expect(detectMagicType(result.canonical)).toBe('image/jpeg');
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.actualSize).toBe(result.canonical.length);
    const meta = await sharp(result.canonical).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(config.outputWidth);
    expect(meta.height).toBe(config.outputHeight);
    expect(meta.space).toBe('srgb');
    expect(meta.exif).toBeUndefined();
  });

  it('covers the source image into the card canvas', async () => {
    const landscape = await makePng(2000, 600);
    const result = await processStudentPhoto(landscape, config);
    expect(result.width).toBe(600);
    expect(result.height).toBe(800);
  });

  it('throws PhotoValidationError for a corrupt image', async () => {
    const corrupt = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.from('not really a jpeg body'),
    ]);
    await expect(processStudentPhoto(corrupt, config)).rejects.toBeInstanceOf(PhotoValidationError);
  });
});
