# Public website assets

Use a separate bucket from the private student-photo and payment-receipt bucket. This limits the
public policy to non-sensitive website artwork and prevents a policy mistake from exposing private
uploads.

## Provider setup

1. Create a public-assets bucket in the same region as the application audience. Keep public bucket
   listing, anonymous writes, object ACL mutation, and deletes disabled.
2. Add a bucket policy that permits anonymous `GetObject` only for `public/site/*`. Do not grant
   anonymous `ListBucket` and do not add a public rule to the private uploads bucket.
3. The existing Arvan Object Storage key pair may be reused when both buckets belong to the same
   storage service. Keep it only in the ignored root `.env`; it is never exposed to the browser.
4. Prefer a custom HTTPS asset/CDN domain. Enable access logs and storage/bandwidth alerts. CORS may
   allow only `GET` and `HEAD` from the production site origin; ordinary image tags do not require
   permissive CORS.

An AWS-style read policy for providers that support bucket policies is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadApprovedPublicSiteAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_PUBLIC_BUCKET/public/site/*"
    }
  ]
}
```

## Upload a release

The uploader reads the existing `ARVAN_S3_ENDPOINT`, `ARVAN_S3_REGION`, `ARVAN_S3_ACCESS_KEY`, and
`ARVAN_S3_SECRET_KEY` from the ignored root `.env`. Add the public bucket and release values there:

```dotenv
PUBLIC_ASSET_BUCKET=samingasht-public-production
ASSET_RELEASE_ID=release-2026-08-12
NEXT_PUBLIC_ASSET_BASE_URL=https://samingasht-public-production.s3.ir-thr-at1.arvanstorage.ir/public/site/release-2026-08-12
```

Then run:

```powershell
pnpm assets:upload
```

The command never deletes or overwrites another release. It uploads WebP files beneath
`public/site/<release-id>/images/`, applies immutable one-year browser caching, and writes a local
SHA-256 migration manifest beneath `.runtime/`.

Set the web build variable to the public URL for that exact release, for example:

```dotenv
NEXT_PUBLIC_ASSET_BASE_URL=https://assets.samingasht.ir/public/site/release-2026-08-12
```

Build and deploy only after opening a few object URLs in an unsigned browser session. Verify that
reads succeed, listing and writes fail, private objects remain inaccessible, and response headers
contain `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, immutable`.

Rollback is a rebuild using the previous release URL. Retain old prefixes for the rollback window;
remove them later only through a separately reviewed lifecycle policy.
