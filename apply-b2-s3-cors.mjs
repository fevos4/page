/**
 * apply-b2-s3-cors.mjs
 * Applies S3-compatible CORS rules to the Backblaze B2 bucket using the
 * AWS SDK PutBucketCors API.
 *
 * Run once: node apply-b2-s3-cors.mjs
 */

import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

// ── credentials from .env ──────────────────────────────────────────────────
const B2_ENDPOINT = 'https://s3.us-east-005.backblazeb2.com';
const B2_KEY_ID   = '005cc70e521b18c0000000001';
const B2_APP_KEY  = 'K005QWTOln5ai2rGJjryGgpaYVccF6w';
const BUCKET      = 'zahravideos'; // must match STORAGE_BUCKET in .env

// Extract region from endpoint: s3.<region>.backblazeb2.com
const regionMatch = B2_ENDPOINT.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
const region = regionMatch ? regionMatch[1] : 'us-east-005';

const s3 = new S3Client({
  endpoint: B2_ENDPOINT,
  region,
  credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY },
  forcePathStyle: true,
});

const corsConfig = {
  CORSRules: [
    {
      ID: 'presigned-upload-rule',
      AllowedOrigins: ['*'],
      AllowedHeaders: ['*'],
      AllowedMethods: ['PUT', 'GET', 'HEAD'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600,
    },
  ],
};

// Apply the rules
console.log(`Applying S3 CORS rules to bucket "${BUCKET}" via PutBucketCors...`);
await s3.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: corsConfig }));
console.log('✅  PutBucketCors succeeded.\n');

// Verify by reading back
console.log('Verifying with GetBucketCors...');
const result = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
console.log('Current S3 CORS rules:');
console.log(JSON.stringify(result.CORSRules, null, 2));
