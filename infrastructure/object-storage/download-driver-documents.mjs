import { createHash, createHmac } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const inputPath = resolve(argument('--input') ?? 'driver-documents.json');
const outputPath = resolve(argument('--output') ?? 'downloaded-driver-documents');
const imagesOnly = process.argv.includes('--images-only');
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

function signedAddress(row) {
  const endpoint = process.env.ARVAN_S3_ENDPOINT?.replace(/\/$/, '');
  const region = process.env.ARVAN_S3_REGION;
  const bucket = process.env.ARVAN_S3_BUCKET;
  const accessKey = process.env.ARVAN_S3_ACCESS_KEY;
  const secretKey = process.env.ARVAN_S3_SECRET_KEY;
  if (!endpoint || !region || !bucket || !accessKey || !secretKey) return row.arvanAddress;

  const endpointUrl = new URL(endpoint);
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;
  const path = `/${[bucket, ...String(row.objectKey).split('/')].map(encode).join('/')}`;
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
  if (row.mimeType === 'application/pdf') return 'pdf';
  if (row.mimeType === 'image/png') return 'png';
  if (row.mimeType === 'image/webp') return 'webp';
  if (row.mimeType === 'image/gif') return 'gif';
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
const drivers = JSON.parse(raw || '[]');
if (!Array.isArray(drivers)) throw new Error('The export must contain a JSON array.');
const rows = drivers.flatMap(({ driver, documents = [] }) =>
  documents.map((document) => ({
    ...document,
    driverId: driver.id,
    firstName: driver.first_name,
    lastName: driver.last_name,
    nationalId: driver.national_id,
  })),
);
const selected = imagesOnly
  ? rows.filter((row) => String(row.mimeType).startsWith('image/'))
  : rows;
const typeCounts = new Map();
let downloaded = 0;
let skipped = 0;

for (const row of selected) {
  const driverFolder = `${safeName(`${row.firstName} ${row.lastName}`)} - ${safeName(row.nationalId)}`;
  const directory = resolve(outputPath, driverFolder);
  await mkdir(directory, { recursive: true });
  const countKey = `${row.driverId}:${row.documentType}`;
  const count = (typeCounts.get(countKey) ?? 0) + 1;
  typeCounts.set(countKey, count);
  const filename = `${safeName(row.documentType)}-${String(count).padStart(2, '0')}-${String(row.documentId).slice(0, 8)}.${extension(row)}`;
  const destination = resolve(directory, filename);
  if (await exists(destination)) {
    console.log(`Skipping existing ${driverFolder} / ${filename}`);
    skipped += 1;
    continue;
  }

  const response = await fetch(signedAddress(row));
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${row.arvanAddress}`);
  }
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error(`Object exceeds 25 MiB: ${row.arvanAddress}`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > maximumBytes) throw new Error(`Object exceeds 25 MiB: ${row.arvanAddress}`);
  await writeFile(destination, body, { flag: 'wx' });
  console.log(`Downloaded ${driverFolder} / ${filename}`);
  downloaded += 1;
}

console.log(`Finished: ${downloaded} downloaded, ${skipped} already existed.`);
