import { createHash, createHmac } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '../..');
const sourceDirectory = join(workspace, 'apps/web/public/images');
const brandLogoPath = join(workspace, 'apps/web/public/samin-gasht-logo.png');
const releaseId = process.env.ASSET_RELEASE_ID?.trim();
const bucket = process.env.PUBLIC_ASSET_BUCKET?.trim();
const endpoint = process.env.ARVAN_S3_ENDPOINT?.trim();
const region = process.env.ARVAN_S3_REGION?.trim();
const accessKey = process.env.ARVAN_S3_ACCESS_KEY?.trim();
const secretKey = process.env.ARVAN_S3_SECRET_KEY?.trim();

if (!releaseId || !/^[A-Za-z0-9._-]{7,128}$/.test(releaseId)) {
  throw new Error('ASSET_RELEASE_ID must be a 7-128 character immutable release identifier.');
}
if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) {
  throw new Error('PUBLIC_ASSET_BUCKET must be a valid S3 bucket name.');
}
if (!endpoint || !region || !accessKey || !secretKey) {
  throw new Error(
    'The existing ARVAN_S3_ENDPOINT, REGION, ACCESS_KEY, and SECRET_KEY are required.',
  );
}
const endpointUrl = new URL(endpoint);
if (endpointUrl.protocol !== 'https:') throw new Error('ARVAN_S3_ENDPOINT must use HTTPS.');

function encode(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function presignPut(key, contentType, expiresInSeconds = 300) {
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;
  const path = `/${[bucket, ...key.split('/')].map(encode).join('/')}`;
  const query = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKey}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresInSeconds)],
    ['X-Amz-SignedHeaders', 'content-type;host;x-amz-acl'],
  ]
    .map(([name, value]) => [encode(name), encode(value)])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');
  const canonicalRequest = [
    'PUT',
    path,
    query,
    `content-type:${contentType}\nhost:${endpointUrl.host}\nx-amz-acl:public-read\n`,
    'content-type;host;x-amz-acl',
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, date), region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `${endpointUrl.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

const files = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.webp'))
  .sort((left, right) => left.name.localeCompare(right.name));

const assets = [
  ...files.map((file) => ({
    localPath: join(sourceDirectory, file.name),
    source: `apps/web/public/images/${file.name}`,
    name: file.name,
    contentType: 'image/webp',
  })),
  {
    localPath: brandLogoPath,
    source: 'apps/web/public/samin-gasht-logo.png',
    name: 'samin-gasht-logo.png',
    contentType: 'image/png',
  },
];

const objects = [];
for (const asset of assets) {
  const bytes = await readFile(asset.localPath);
  const key = `public/site/${releaseId}/images/${basename(asset.name)}`;
  const response = await fetch(presignPut(key, asset.contentType), {
    method: 'PUT',
    body: bytes,
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-amz-acl': 'public-read',
    },
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`Upload failed for ${asset.name}: HTTP ${response.status} ${details}`);
  }
  console.log(`Uploaded ${asset.name}`);

  objects.push({
    source: asset.source,
    key,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    contentType: asset.contentType,
    cacheControl: 'public, max-age=31536000, immutable',
  });
}

const runtimeDirectory = join(workspace, '.runtime');
await mkdir(runtimeDirectory, { recursive: true });
const manifestPath = join(runtimeDirectory, `public-assets-${releaseId}.json`);
await writeFile(
  manifestPath,
  `${JSON.stringify({ bucket, endpoint, region, releaseId, objects }, null, 2)}\n`,
  'utf8',
);

console.log(`Uploaded ${objects.length} immutable assets.`);
console.log(`Manifest: ${manifestPath}`);
console.log(`Set NEXT_PUBLIC_ASSET_BASE_URL to your public origin + /public/site/${releaseId}`);
