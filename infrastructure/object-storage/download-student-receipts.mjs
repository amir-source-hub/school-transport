import { createHash, createHmac } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputPath = resolve(argument('--input') ?? 'student-receipts.json');
const outputPath = resolve(argument('--output') ?? 'receipts');
const maximumBytes = 25 * 1024 * 1024;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function safeName(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[-. ]+|[-. ]+$/g, '')
    .slice(0, 100);
}

function encode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function signingKey(secret, date, region) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('PUT_YOUR_')) throw new Error(`${name} is missing from .env.`);
  return value;
}

function signedAddress(row) {
  const endpoint = requiredEnvironment('ARVAN_S3_ENDPOINT').replace(/\/$/, '');
  const region = requiredEnvironment('ARVAN_S3_REGION');
  const bucket = requiredEnvironment('ARVAN_S3_BUCKET');
  const accessKey = requiredEnvironment('ARVAN_S3_ACCESS_KEY');
  const secretKey = requiredEnvironment('ARVAN_S3_SECRET_KEY');
  const endpointUrl = new URL(endpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;
  const path = `/${[bucket, ...String(row.receipt.objectKey).split('/')].map(encode).join('/')}`;
  const query = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKey}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', '300'],
    ['X-Amz-SignedHeaders', 'host'],
  ]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const canonicalRequest = [
    'GET',
    path,
    query,
    `host:${endpointUrl.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signature = hmac(signingKey(secretKey, date, region), stringToSign).toString('hex');
  return `${endpointUrl.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

function extension(row) {
  if (row.receipt.mimeType === 'image/png') return 'png';
  if (row.receipt.mimeType === 'image/webp') return 'webp';
  if (row.receipt.mimeType === 'application/pdf') return 'pdf';
  return 'jpg';
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const raw = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '').trim();
const rows = JSON.parse(raw || '[]');
if (!Array.isArray(rows)) throw new Error('The receipt export must contain a JSON array.');

let downloaded = 0;
let skipped = 0;
const failures = [];
for (const row of rows) {
  const student = row.student ?? {};
  const submission = row.submission ?? {};
  const schedule = row.scheduleItem ?? {};
  const studentName = `${student.first_name ?? 'unknown'} ${student.last_name ?? 'student'}`;
  const studentFolder = `${safeName(studentName)} - ${safeName(student.national_id ?? student.id ?? 'unknown')}`;
  const directory = resolve(outputPath, studentFolder);
  await mkdir(directory, { recursive: true });
  const paidDate = String(submission.paid_at ?? submission.created_at ?? 'unknown').slice(0, 10);
  const filename = [
    'receipt',
    safeName(schedule.item_type ?? 'payment'),
    String(schedule.sequence_number ?? 0).padStart(2, '0'),
    safeName(submission.status ?? 'unknown'),
    paidDate,
    String(submission.id ?? '').slice(0, 8),
  ].join('-') + `.${extension(row)}`;
  const destination = resolve(directory, filename);
  if (await exists(destination)) {
    console.log(`Skipping existing ${studentFolder} / ${filename}`);
    skipped += 1;
    continue;
  }

  try {
    const response = await fetch(signedAddress(row));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
      await response.body?.cancel();
      throw new Error('object exceeds 25 MiB');
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > maximumBytes) throw new Error('object exceeds 25 MiB');
    await writeFile(destination, body, { flag: 'wx' });
    console.log(`Downloaded ${studentFolder} / ${filename}`);
    downloaded += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed ${studentFolder} / ${filename}: ${message}`);
    failures.push({
      studentId: student.id,
      studentName,
      nationalId: student.national_id,
      submissionId: submission.id,
      objectKey: row.receipt?.objectKey,
      error: message,
    });
  }
}

if (failures.length) {
  await writeFile(resolve(outputPath, 'failed-downloads.json'), JSON.stringify(failures, null, 2));
}
console.log(
  `Finished: ${downloaded} downloaded, ${skipped} already existed, ${failures.length} failed.`,
);
if (failures.length) process.exitCode = 2;
