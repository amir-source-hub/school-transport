import { createHash } from 'node:crypto';
import sharp from 'sharp';

export interface PhotoProcessingConfig {
  maxBytes: number;
  maxPixels: number;
  maxAxis: number;
  outputWidth: number;
  outputHeight: number;
  jpegQuality: number;
  processingTimeoutSeconds?: number;
}

export interface ProcessedPhoto {
  canonical: Buffer;
  width: number;
  height: number;
  checksum: string;
  actualSize: number;
}

export class PhotoValidationError extends Error {
  constructor(
    public readonly rejectionCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'PhotoValidationError';
  }
}

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectMagicType(buffer: Buffer): 'image/jpeg' | 'image/png' | null {
  if (
    buffer.length > JPEG_MAGIC.length &&
    buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)
  ) {
    return 'image/jpeg';
  }
  if (buffer.length > PNG_MAGIC.length && buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    return 'image/png';
  }
  return null;
}

function effectiveDimensions(width: number, height: number, orientation: number) {
  if (orientation >= 5 && orientation <= 8) return { width: height, height: width };
  return { width, height };
}

export async function processStudentPhoto(
  source: Buffer,
  config: PhotoProcessingConfig,
): Promise<ProcessedPhoto> {
  if (source.length === 0)
    throw new PhotoValidationError('ZERO_BYTE', 'The uploaded file is empty.');
  if (source.length > config.maxBytes) {
    throw new PhotoValidationError('TOO_LARGE', 'The uploaded file exceeds the size limit.');
  }
  const magic = detectMagicType(source);
  if (!magic) {
    throw new PhotoValidationError('UNSUPPORTED_FORMAT', 'The uploaded file is not a valid image.');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(source, {
      failOn: 'none',
      limitInputPixels: config.maxPixels + 1,
    }).metadata();
  } catch {
    throw new PhotoValidationError('CORRUPT_IMAGE', 'The image could not be decoded.');
  }
  if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    throw new PhotoValidationError('CORRUPT_IMAGE', 'The image has no valid dimensions.');
  }
  const { width: effWidth, height: effHeight } = effectiveDimensions(
    metadata.width,
    metadata.height,
    metadata.orientation ?? 1,
  );
  if (effWidth * effHeight > config.maxPixels) {
    throw new PhotoValidationError('TOO_MANY_PIXELS', 'The image has too many pixels.');
  }
  if (Math.max(effWidth, effHeight) > config.maxAxis) {
    throw new PhotoValidationError('EXTREME_AXIS', 'The image exceeds the maximum axis length.');
  }
  const aspect = Math.max(effWidth / effHeight, effHeight / effWidth);
  if (aspect > 10) {
    throw new PhotoValidationError(
      'EXTREME_ASPECT_RATIO',
      'The image aspect ratio is not supported.',
    );
  }

  let canonical: Buffer;
  try {
    canonical = await sharp(source, {
      failOn: 'none',
      limitInputPixels: config.maxPixels + 1,
    })
      .timeout({ seconds: config.processingTimeoutSeconds ?? 10 })
      .rotate()
      .resize(config.outputWidth, config.outputHeight, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: config.jpegQuality, mozjpeg: true })
      .toColorspace('srgb')
      .toBuffer();
  } catch {
    throw new PhotoValidationError('CORRUPT_IMAGE', 'The image could not be processed.');
  }

  const outputMetadata = await sharp(canonical).metadata();
  if (
    outputMetadata.format !== 'jpeg' ||
    outputMetadata.width !== config.outputWidth ||
    outputMetadata.height !== config.outputHeight
  ) {
    throw new PhotoValidationError(
      'CANONICAL_REJECTED',
      'The processed image did not meet the canonical card requirements.',
    );
  }
  return {
    canonical,
    width: config.outputWidth,
    height: config.outputHeight,
    checksum: createHash('sha256').update(canonical).digest('hex'),
    actualSize: canonical.length,
  };
}
