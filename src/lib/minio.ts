import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
const port = process.env.MINIO_PORT || '9000';
const useSSL = process.env.MINIO_USE_SSL === 'true';
const protocol = useSSL ? 'https' : 'http';

const provider = process.env.STORAGE_PROVIDER || 'minio';
const isR2 = provider === 'r2';
const isB2 = provider === 'b2';

// 1. Build endpoint dynamically
let endpointUrl = `${protocol}://${endpoint}:${port}`;
if (isR2) {
  endpointUrl = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
} else if (isB2) {
  endpointUrl = process.env.B2_ENDPOINT || '';
}

// 2. Resolve region parameter (e.g. R2 uses auto, B2 parses region from endpoint like s3.us-west-004.backblazeb2.com)
let s3Region = 'us-east-1';
if (isR2) {
  s3Region = 'auto';
} else if (isB2 && endpointUrl) {
  const match = endpointUrl.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/i);
  if (match) s3Region = match[1];
}

// 3. Match credential payload
let accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
let secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';
if (isR2) {
  accessKey = process.env.R2_ACCESS_KEY_ID || '';
  secretKey = process.env.R2_SECRET_ACCESS_KEY || '';
} else if (isB2) {
  accessKey = process.env.B2_KEY_ID || '';
  secretKey = process.env.B2_APPLICATION_KEY || '';
}

export const s3Client = new S3Client({
  region: s3Region,
  endpoint: endpointUrl,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  // forcePathStyle = true for local MinIO and B2, false for R2
  forcePathStyle: !isR2,
  // Disable automatic checksum headers (CRC32 etc.) that AWS SDK v3 adds by default.
  // Backblaze B2 (and some MinIO versions) do not accept these headers in presigned PUT
  // requests, causing CORS preflight failures or signature mismatches.
  requestChecksumCalculation: 'WHEN_REQUIRED' as any,
  responseChecksumValidation: 'WHEN_REQUIRED' as any,
});

export const BUCKET_NAME = process.env.STORAGE_BUCKET || 'videos';

let bucketVerified = false;

export async function ensureBucketExists(): Promise<void> {
  if (isR2 || isB2) return;
  if (bucketVerified) return;

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    bucketVerified = true;
  } catch (err: any) {
    const isNotFound = err.name === 'NotFound' || err.name === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404;
    if (isNotFound) {
      console.log(`[MinIO] Bucket "${BUCKET_NAME}" does not exist. Creating bucket...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`[MinIO] Bucket "${BUCKET_NAME}" created successfully.`);

        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
            },
          ],
        };
        try {
          await s3Client.send(
            new PutBucketPolicyCommand({
              Bucket: BUCKET_NAME,
              Policy: JSON.stringify(policy),
            })
          );
          console.log(`[MinIO] Set public download policy on bucket "${BUCKET_NAME}".`);
        } catch (policyErr) {
          console.warn(`[MinIO] Warning: Failed to set public policy on bucket "${BUCKET_NAME}":`, policyErr);
        }

        bucketVerified = true;
      } catch (createErr: any) {
        console.error(`[MinIO] ERROR: Failed to create bucket "${BUCKET_NAME}":`, createErr);
        throw new Error(`MinIO bucket "${BUCKET_NAME}" creation failed: ${createErr.message || createErr}`);
      }
    } else {
      console.error(`[MinIO] ERROR: Failed to verify bucket "${BUCKET_NAME}":`, err);
      throw new Error(`MinIO bucket "${BUCKET_NAME}" verification failed: ${err.message || err}`);
    }
  }
}

export async function generatePresignedGetUrl(objectPath: string, expiresInSeconds = 900): Promise<string | null> {
  try {
    if (!objectPath) return null;
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectPath,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.error(`Failed to generate presigned GET URL for ${objectPath}:`, error);
    return null;
  }
}

export async function generatePresignedPutUrl(objectPath: string, contentType: string, expiresInSeconds = 900): Promise<string> {
  await ensureBucketExists();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectPath,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function deleteMinIOObject(objectPath: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectPath,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error(`Failed to delete object from MinIO (${objectPath}):`, error);
  }
}
