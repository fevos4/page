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

export const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: `${protocol}://${endpoint}:${port}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'videos';

let bucketVerified = false;

export async function ensureBucketExists(): Promise<void> {
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

export async function generatePresignedGetUrl(objectPath: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectPath,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
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
