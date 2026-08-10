import { createHash } from 'node:crypto';
import sharp from 'sharp';

export class ReceiptImageError extends Error {}

export async function processReceiptImage(
  input: Buffer,
  limits: { maxBytes: number; maxPixels: number; maxAxis: number },
) {
  if (input.length === 0 || input.length > limits.maxBytes)
    throw new ReceiptImageError('INVALID_SIZE');
  const jpeg = input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const png =
    input.length >= 8 &&
    input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!jpeg && !png) throw new ReceiptImageError('INVALID_SIGNATURE');
  const image = sharp(input, { failOn: 'error', limitInputPixels: limits.maxPixels });
  const metadata = await image.metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width > limits.maxAxis ||
    metadata.height > limits.maxAxis
  ) {
    throw new ReceiptImageError('INVALID_DIMENSIONS');
  }
  const canonical = await image
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toColorspace('srgb')
    .toBuffer();
  const result = await sharp(canonical).metadata();
  return {
    sourceMime: jpeg ? 'image/jpeg' : 'image/png',
    canonical,
    mime: 'image/jpeg',
    size: canonical.length,
    width: result.width!,
    height: result.height!,
    checksum: createHash('sha256').update(canonical).digest('hex'),
  };
}
