import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export async function generatePresignedGetUrl(objectPath: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: objectPath,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function generatePresignedPutUrl(objectPath: string, contentType: string, expiresInSeconds = 900): Promise<string> {
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
