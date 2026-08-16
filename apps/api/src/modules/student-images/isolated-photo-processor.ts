import { spawn } from 'node:child_process';
import type { PhotoProcessingConfig, ProcessedPhoto } from './student-photo-processor';
import { PhotoValidationError } from './student-photo-processor';

const MAX_CHILD_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENT_PHOTO_PROCESSES = 2;
let activeProcesses = 0;
const waiters: Array<() => void> = [];

async function acquireSlot() {
  if (activeProcesses >= MAX_CONCURRENT_PHOTO_PROCESSES) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  activeProcesses += 1;
}

function releaseSlot() {
  activeProcesses -= 1;
  waiters.shift()?.();
}

const CHILD_SOURCE = String.raw`
const sharp = require('sharp');
const { createHash } = require('node:crypto');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  const fail = (rejectionCode, message) => {
    process.stdout.write(JSON.stringify({ ok: false, rejectionCode, message }));
    process.exitCode = 2;
  };
  try {
    const payload = JSON.parse(input);
    const source = Buffer.from(payload.source, 'base64');
    const config = payload.config;
    const jpeg = source.length > 3 && source[0] === 0xff && source[1] === 0xd8 && source[2] === 0xff;
    const pngMagic = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
    const png = source.length > 8 && source.subarray(0, 8).equals(pngMagic);
    if (!source.length) return fail('ZERO_BYTE', 'The uploaded file is empty.');
    if (source.length > config.maxBytes) return fail('TOO_LARGE', 'The uploaded file exceeds the size limit.');
    if (!jpeg && !png) return fail('UNSUPPORTED_FORMAT', 'The uploaded file is not a valid image.');
    let metadata;
    try { metadata = await sharp(source, { failOn: 'none', limitInputPixels: config.maxPixels + 1 }).metadata(); }
    catch { return fail('CORRUPT_IMAGE', 'The image could not be decoded.'); }
    if (!metadata.width || !metadata.height) return fail('CORRUPT_IMAGE', 'The image has no valid dimensions.');
    const rotated = (metadata.orientation || 1) >= 5 && (metadata.orientation || 1) <= 8;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    if (width * height > config.maxPixels) return fail('TOO_MANY_PIXELS', 'The image has too many pixels.');
    if (Math.max(width, height) > config.maxAxis) return fail('EXTREME_AXIS', 'The image exceeds the maximum axis length.');
    if (Math.max(width / height, height / width) > 10) return fail('EXTREME_ASPECT_RATIO', 'The image aspect ratio is not supported.');
    let canonical;
    try {
      canonical = await sharp(source, { failOn: 'none', limitInputPixels: config.maxPixels + 1 })
        .timeout({ seconds: config.processingTimeoutSeconds || 10 }).rotate()
        .resize(config.outputWidth, config.outputHeight, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: config.jpegQuality, mozjpeg: true }).toColorspace('srgb').toBuffer();
    } catch { return fail('CORRUPT_IMAGE', 'The image could not be processed.'); }
    const output = await sharp(canonical).metadata();
    if (output.format !== 'jpeg' || output.width !== config.outputWidth || output.height !== config.outputHeight)
      return fail('CANONICAL_REJECTED', 'The processed image did not meet canonical requirements.');
    process.stdout.write(JSON.stringify({ ok: true, canonical: canonical.toString('base64'), width: config.outputWidth,
      height: config.outputHeight, checksum: createHash('sha256').update(canonical).digest('hex'), actualSize: canonical.length }));
  } catch (error) {
    fail('PROCESSING_FAILED', error instanceof Error ? error.message : 'Photo processing failed.');
  }
});
`;

export async function processStudentPhotoIsolated(
  source: Buffer,
  config: PhotoProcessingConfig,
): Promise<ProcessedPhoto> {
  await acquireSlot();
  try {
    return await new Promise<ProcessedPhoto>((resolve, reject) => {
      const child = spawn(process.execPath, ['--max-old-space-size=128', '-e', CHILD_SOURCE], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });
      const output: Buffer[] = [];
      let outputBytes = 0;
      let settled = false;
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback();
      };
      const timer = setTimeout(
        () => {
          child.kill('SIGKILL');
          finish(() =>
            reject(new PhotoValidationError('PROCESSING_TIMEOUT', 'Photo processing timed out.')),
          );
        },
        (config.processingTimeoutSeconds ?? 10) * 1_000 + 2_000,
      );
      child.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_CHILD_OUTPUT_BYTES) {
          child.kill('SIGKILL');
          finish(() =>
            reject(
              new PhotoValidationError(
                'OUTPUT_TOO_LARGE',
                'Photo processor output exceeded its limit.',
              ),
            ),
          );
          return;
        }
        output.push(chunk);
      });
      child.once('error', (error) => finish(() => reject(error)));
      child.once('close', () =>
        finish(() => {
          try {
            const result = JSON.parse(Buffer.concat(output).toString('utf8')) as
              | ({ ok: true; canonical: string } & Omit<ProcessedPhoto, 'canonical'>)
              | { ok: false; rejectionCode: string; message: string };
            if (!result.ok) throw new PhotoValidationError(result.rejectionCode, result.message);
            resolve({ ...result, canonical: Buffer.from(result.canonical, 'base64') });
          } catch (error) {
            reject(
              error instanceof PhotoValidationError
                ? error
                : new PhotoValidationError(
                    'PROCESSING_FAILED',
                    'Photo processor returned invalid output.',
                  ),
            );
          }
        }),
      );
      child.stdin.end(JSON.stringify({ source: source.toString('base64'), config }));
    });
  } finally {
    releaseSlot();
  }
}
